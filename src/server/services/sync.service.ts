import { buildMostPicked } from "@/domain/sync/build-most-picked";
import {
  calculateGroupStandings,
  type GroupMatch
} from "@/domain/standings/calculate-group-standings";
import {
  groups,
  participants as staticParticipants,
  resolveParticipantByCountry
} from "@/domain/participants/static-league-data";
import { cartolaClient } from "@/lib/cartola/client";
import {
  mapAthleteCatalog,
  type CartolaAthletesMarketPayload,
  type CartolaLineupPayload
} from "@/lib/cartola/mappers";
import { HttpError } from "@/lib/utils/http";
import { MatchRepository } from "@/server/repositories/match.repository";
import { MostPickedRepository } from "@/server/repositories/most-picked.repository";
import { ParticipantRepository } from "@/server/repositories/participant.repository";
import { RoundRepository, type RoundStatus } from "@/server/repositories/round.repository";
import { StandingsSnapshotRepository } from "@/server/repositories/standings-snapshot.repository";
import { SyncConfigRepository } from "@/server/repositories/sync-config.repository";
import { SyncExecutionRepository } from "@/server/repositories/sync-execution.repository";
import { LineupSnapshotRepository } from "@/server/repositories/lineup-snapshot.repository";

type SyncTriggerType = "automatic_access" | "manual_admin";

type SyncParticipant = {
  id: string;
  groupId: string | null;
  representedCountry: string;
  cartolaTeamId: number;
  cartolaTeamName: string;
  staticId: string;
};

type AthleteCatalogEntry = {
  athleteId: number;
  clubId: number;
  positionId: number;
  name: string;
  shortName: string;
  photo: string | null;
};

type NormalizedPlayer = {
  athleteId: number;
  playerName: string;
  clubName: string | null;
  positionName: string | null;
  positionId: number;
  points: number;
  entered: boolean;
  source: "starter" | "reserve";
};

type NormalizedLineup = {
  participantDbId: string;
  participantStaticId: string;
  roundNumber: number;
  totalPoints: number;
  captainId: number | null;
  reserveLuxuryId: number | null;
  starters: NormalizedPlayer[];
  reserves: NormalizedPlayer[];
  effectivePlayers: NormalizedPlayer[];
  rawPayloadRef: string;
};

type SyncPublicMatch = {
  id: string;
  phase: string;
  phaseSlot: string;
  groupCode: string | null;
  roundNumber: number;
  state: "partial" | "official" | "scheduled";
  homeParticipantId: string;
  awayParticipantId: string;
  homePoints: number | null;
  awayPoints: number | null;
};

const GROUP_STAGE_ROUNDS = [1, 2, 3] as const;
const GROUP_STAGE_TOTAL_MATCHES = 72;
const ROUND_PAIRINGS: Record<number, [number, number][]> = {
  1: [
    [0, 1],
    [2, 3]
  ],
  2: [
    [3, 1],
    [0, 2]
  ],
  3: [
    [1, 2],
    [3, 0]
  ]
};

export class SyncService {
  private readonly syncConfigRepository = new SyncConfigRepository();
  private readonly syncExecutionRepository = new SyncExecutionRepository();
  private readonly participantRepository = new ParticipantRepository();
  private readonly roundRepository = new RoundRepository();
  private readonly matchRepository = new MatchRepository();
  private readonly standingsSnapshotRepository = new StandingsSnapshotRepository();
  private readonly lineupSnapshotRepository = new LineupSnapshotRepository();
  private readonly mostPickedRepository = new MostPickedRepository();

  async shouldRunAccessDrivenSync() {
    try {
      const config = await this.syncConfigRepository.getCurrentConfig();
      return Boolean(config?.is_enabled);
    } catch {
      return false;
    }
  }

  async runAccessDrivenSyncIfDue() {
    const config = await this.syncConfigRepository.getCurrentConfig();

    if (!config.is_enabled) {
      return { executed: false, reason: "disabled" } as const;
    }

    const latestExecution = await this.syncExecutionRepository.getLatest();
    const intervalMs = Math.max(1, config.interval_minutes) * 60_000;
    const latestFinishedAt = latestExecution?.finished_at
      ? new Date(latestExecution.finished_at).getTime()
      : 0;

    if (latestFinishedAt > 0 && Date.now() - latestFinishedAt < intervalMs) {
      return { executed: false, reason: "interval_not_elapsed" } as const;
    }

    await this.runSync("automatic_access");

    return { executed: true, reason: "synced" } as const;
  }

  async runManualSync() {
    return this.runSync("manual_admin");
  }

  async getAdminStatus() {
    const [
      config,
      latestExecution,
      recentExecutions,
      rounds,
      matchesCount,
      standingsCount,
      lineupCounts,
      mostPickedCount
    ] = await Promise.all([
      this.syncConfigRepository.getCurrentConfig(),
      this.syncExecutionRepository.getLatest(),
      this.syncExecutionRepository.listRecent(),
      this.roundRepository.listAll()
      ,
      this.matchRepository.countAll(),
      this.standingsSnapshotRepository.countAll(),
      this.lineupSnapshotRepository.getCounts(),
      this.mostPickedRepository.countAll()
    ]);

    const currentRound = this.resolveCurrentRoundFromRows(rounds);
    const officialRound = [...rounds]
      .filter((round) => round.status === "official")
      .sort((left, right) => right.external_round_id - left.external_round_id)[0] ?? null;
    const lastSyncedRound = [...rounds]
      .filter((round) => Boolean(round.last_synced_at))
      .sort(
        (left, right) =>
          new Date(right.last_synced_at ?? 0).getTime() -
          new Date(left.last_synced_at ?? 0).getTime()
      )[0] ?? null;

    return {
      config,
      latestExecution,
      currentRound,
      officialRound,
      lastSyncedRound,
      totalMatches: GROUP_STAGE_TOTAL_MATCHES,
      recentExecutions,
      persistedSnapshotCounts: {
        matches: matchesCount,
        standings: standingsCount,
        lineupSnapshots: lineupCounts.snapshots,
        lineupPlayers: lineupCounts.players,
        mostPicked: mostPickedCount
      }
    };
  }

  private async runSync(triggerType: SyncTriggerType) {
    const startedAt = new Date().toISOString();

    try {
      const [marketStatus, fixtures, athletesMarket, athletesScored, participants] =
        await Promise.all([
          cartolaClient.getMarketStatus(),
          cartolaClient.getFixtures(),
          cartolaClient.getAthletesMarket().catch(() => null),
          cartolaClient.getAthletesScored().catch(() => null),
          this.getParticipantsForSync()
        ]);

      const athleteCatalog = athletesMarket
        ? mapAthleteCatalog(athletesMarket)
        : new Map<number, AthleteCatalogEntry>();
      const currentRoundNumber = marketStatus.rodada_atual;
      const hasLiveAthleteScores = Boolean(
        athletesScored && Object.keys(athletesScored.atletas).length > 0
      );
      const isLiveRound = marketStatus.bola_rolando && hasLiveAthleteScores;
      const lineupsByRound = await this.loadLineupsByRound(
        currentRoundNumber,
        participants,
        athleteCatalog,
        athletesMarket
      );
      const officialRoundNumber = this.getOfficialRoundNumber(
        lineupsByRound,
        currentRoundNumber
      );
      const matches = this.buildMatches({
        currentRoundNumber,
        officialRoundNumber,
        isLiveRound,
        fixtures,
        lineupsByRound
      });

      const persistedRounds = await this.persistRounds({
        currentRoundNumber,
        officialRoundNumber,
        isLiveRound,
        marketStatusCode: String(marketStatus.status_mercado)
      });

      const roundByNumber = new Map(
        persistedRounds.map((round) => [round.external_round_id, round])
      );

      await Promise.all(
        GROUP_STAGE_ROUNDS.map(async (roundNumber) => {
          const round = roundByNumber.get(roundNumber);

          if (!round) {
            return;
          }

          const roundMatches = matches.filter((match) => match.roundNumber === roundNumber);
          const roundState = roundMatches[0]?.state ?? "scheduled";
          const roundLineups = lineupsByRound[roundNumber] ?? [];

          await this.matchRepository.replaceRoundMatches(
            round.id,
            roundMatches.map((match, index) => ({
              phase: match.phase,
              phaseSlot: `${match.groupCode ?? "NA"}-r${roundNumber}-m${index + 1}`,
              groupId:
                groups.find((group) => group.code === match.groupCode)?.code
                  ? participants.find(
                      (participant) => participant.staticId === match.homeParticipantId
                    )?.groupId ?? null
                  : null,
              roundId: round.id,
              homeParticipantId: participants.find(
                (participant) => participant.staticId === match.homeParticipantId
              )!.id,
              awayParticipantId: participants.find(
                (participant) => participant.staticId === match.awayParticipantId
              )!.id,
              homePoints: match.homePoints,
              awayPoints: match.awayPoints,
              resultType:
                match.homePoints === null || match.awayPoints === null
                  ? null
                  : this.resolveResultType(match.homePoints, match.awayPoints),
              state: match.state,
              decidedByRule:
                match.homePoints === null || match.awayPoints === null
                  ? "score"
                  : Math.abs(match.homePoints - match.awayPoints) <= 5
                    ? "draw_threshold"
                    : "score"
            }))
          );

          const standings = this.buildStandingsForRound(
            matches,
            roundNumber,
            roundState
          );

          await this.standingsSnapshotRepository.replaceRoundSnapshots(
            round.id,
            standings.map((standing) => ({
              scope: "group",
              phase: "groups",
              groupId: participants.find(
                (participant) => participant.staticId === standing.participantId
              )?.groupId ?? null,
              participantId: participants.find(
                (participant) => participant.staticId === standing.participantId
              )!.id,
              roundId: round.id,
              points: standing.points,
              wins: standing.wins,
              draws: standing.draws,
              losses: standing.losses,
              pointsFor: standing.pointsFor,
              pointsAgainst: standing.pointsAgainst,
              pointsDifference: standing.pointsDifference,
              position: standing.position,
              statusLabel: standing.statusLabel,
              state: roundState
            }))
          );

          await this.lineupSnapshotRepository.replaceRoundSnapshots(
            round.id,
            roundLineups.map((lineup) => ({
              participantId: lineup.participantDbId,
              roundId: round.id,
              captainId: lineup.captainId,
              reserveLuxuryId: lineup.reserveLuxuryId,
              captainName:
                lineup.captainId !== null
                  ? athleteCatalog.get(lineup.captainId)?.name ?? null
                  : null,
              coachName: null,
              formationLabel: null,
              totalPoints: lineup.totalPoints,
              state: roundState,
              rawPayloadRef: lineup.rawPayloadRef,
              players: [
                ...lineup.starters.map((player) => ({
                  athleteId: player.athleteId,
                  playerName: player.playerName,
                  clubName: player.clubName,
                  positionName: player.positionName,
                  captainMultiplier: lineup.captainId === player.athleteId ? 2 : 1,
                  points: player.points,
                  statusLabel: player.entered ? "entered" : "bench",
                  source: "starter" as const,
                  entered: player.entered,
                  counted: lineup.effectivePlayers.some(
                    (effectivePlayer) =>
                      effectivePlayer.athleteId === player.athleteId &&
                      effectivePlayer.source === "starter"
                  )
                })),
                ...lineup.reserves.map((player) => ({
                  athleteId: player.athleteId,
                  playerName: player.playerName,
                  clubName: player.clubName,
                  positionName: player.positionName,
                  captainMultiplier: 1,
                  points: player.points,
                  statusLabel: player.entered ? "reserve_entered" : "reserve_bench",
                  source: "reserve" as const,
                  entered: player.entered,
                  counted: lineup.effectivePlayers.some(
                    (effectivePlayer) =>
                      effectivePlayer.athleteId === player.athleteId &&
                      effectivePlayer.source === "reserve"
                  )
                }))
              ]
            }))
          );

          const mostPicked = buildMostPicked(
            roundLineups.map((lineup) =>
              lineup.effectivePlayers.map((player) => ({
                athleteId: player.athleteId,
                playerName: player.playerName,
                clubName: player.clubName,
                positionName: player.positionName
              }))
            )
          );

          await this.mostPickedRepository.replaceRoundSnapshots(
            round.id,
            mostPicked.map((player) => ({
              roundId: round.id,
              athleteId: player.athleteId,
              playerName: player.playerName,
              clubName: player.clubName ?? null,
              positionName: player.positionName ?? null,
              pickCount: player.pickCount,
              rankPosition: player.rankPosition,
              state: roundState
            }))
          );
        })
      );

      const affectedRound = roundByNumber.get(currentRoundNumber) ?? null;
      const finishedAt = new Date().toISOString();
      const execution = await this.syncExecutionRepository.create({
        triggerType,
        status: "success",
        summaryMessage: `Sync concluido para ${this.formatRoundLabel(currentRoundNumber)} com ${matches.filter((match) => match.state !== "scheduled").length} jogos consolidados.`,
        startedAt,
        finishedAt,
        affectedRoundId: affectedRound?.id ?? null
      });

      return {
        execution,
        currentRoundNumber,
        officialRoundNumber,
        matchCount: matches.length,
        lineupCount: Object.values(lineupsByRound).flat().length
      };
    } catch (error) {
      const execution = await this.syncExecutionRepository.create({
        triggerType,
        status: "failed",
        summaryMessage:
          error instanceof Error ? error.message : "Falha inesperada durante o sync",
        startedAt,
        finishedAt: new Date().toISOString()
      });

      throw new HttpError(500, execution.summary_message);
    }
  }

  private async persistRounds({
    currentRoundNumber,
    officialRoundNumber,
    isLiveRound,
    marketStatusCode
  }: {
    currentRoundNumber: number;
    officialRoundNumber: number;
    isLiveRound: boolean;
    marketStatusCode: string;
  }) {
    const lastSyncedAt = new Date().toISOString();

    return Promise.all(
      GROUP_STAGE_ROUNDS.map((roundNumber) =>
        this.roundRepository.upsert({
          externalRoundId: roundNumber,
          name: this.formatRoundLabel(roundNumber),
          status: this.resolveRoundStatus({
            roundNumber,
            currentRoundNumber,
            officialRoundNumber,
            isLiveRound
          }),
          marketStatus: marketStatusCode,
          officializedAt:
            roundNumber <= officialRoundNumber ? lastSyncedAt : null,
          lastSyncedAt,
          sourceVersion: [
            `current:${currentRoundNumber}`,
            `official:${officialRoundNumber}`,
            `live:${isLiveRound}`
          ].join("|")
        })
      )
    );
  }

  private resolveRoundStatus({
    roundNumber,
    currentRoundNumber,
    officialRoundNumber,
    isLiveRound
  }: {
    roundNumber: number;
    currentRoundNumber: number;
    officialRoundNumber: number;
    isLiveRound: boolean;
  }): RoundStatus {
    if (roundNumber < currentRoundNumber && roundNumber <= officialRoundNumber) {
      return "official";
    }

    if (roundNumber === currentRoundNumber) {
      if (isLiveRound) {
        return "live";
      }

      if (roundNumber <= officialRoundNumber) {
        return "official";
      }
    }

    return "scheduled";
  }

  private async getParticipantsForSync(): Promise<SyncParticipant[]> {
    const participants = await this.participantRepository.listAll();

    if (participants.length === 0) {
      throw new HttpError(503, "Participants are not seeded in the database");
    }

    return participants.map((participant) => {
      const staticParticipant =
        staticParticipants.find(
          (item) => item.cartolaTeamId === participant.cartola_team_id
        ) ??
        resolveParticipantByCountry(participant.represented_country);

      if (!staticParticipant) {
        throw new HttpError(
          500,
          `Static participant mapping not found for team ${participant.cartola_team_id}`
        );
      }

      return {
        id: participant.id,
        groupId: participant.group_id,
        representedCountry: participant.represented_country,
        cartolaTeamId: participant.cartola_team_id,
        cartolaTeamName: participant.cartola_team_name,
        staticId: staticParticipant.id
      };
    });
  }

  private async loadLineupsByRound(
    currentRoundNumber: number,
    participants: SyncParticipant[],
    athleteCatalog: Map<number, AthleteCatalogEntry>,
    market: CartolaAthletesMarketPayload | null
  ) {
    const lineupsByRound: Record<number, NormalizedLineup[]> = {};

    await Promise.all(
      GROUP_STAGE_ROUNDS.filter((roundNumber) => roundNumber <= currentRoundNumber).map(
        async (roundNumber) => {
          const results = await Promise.allSettled(
            participants.map((participant) =>
              cartolaClient.getTeamById(participant.cartolaTeamId, roundNumber)
            )
          );

          lineupsByRound[roundNumber] = results.flatMap((result, index) => {
            if (result.status === "rejected") {
              return [];
            }

            const participant = participants[index]!;
            const normalized = this.normalizeLineupSnapshot({
              requestedRoundNumber: roundNumber,
              currentRoundNumber,
              lineup: result.value,
              participant,
              athleteCatalog,
              market
            });

            return normalized ? [normalized] : [];
          });
        }
      )
    );

    return lineupsByRound;
  }

  private normalizeLineupSnapshot({
    requestedRoundNumber,
    currentRoundNumber,
    lineup,
    participant,
    athleteCatalog,
    market
  }: {
    requestedRoundNumber: number;
    currentRoundNumber: number;
    lineup: CartolaLineupPayload;
    participant: SyncParticipant;
    athleteCatalog: Map<number, AthleteCatalogEntry>;
    market: CartolaAthletesMarketPayload | null;
  }): NormalizedLineup | null {
    const allPlayers = [...lineup.atletas, ...lineup.reservas];
    const detectedRounds = [
      ...new Set(
        allPlayers
          .map((player) => player.rodada_id)
          .filter((roundId): roundId is number => typeof roundId === "number")
      )
    ];
    const detectedRound = detectedRounds.length === 1 ? detectedRounds[0] : null;

    if (
      requestedRoundNumber === currentRoundNumber &&
      detectedRound !== requestedRoundNumber
    ) {
      return null;
    }

    if (
      requestedRoundNumber < currentRoundNumber &&
      detectedRound !== null &&
      detectedRound !== requestedRoundNumber
    ) {
      return null;
    }

    const starters = lineup.atletas.map((player) =>
      this.mapLineupPlayer(player, athleteCatalog, market, "starter")
    );
    const reserves = lineup.reservas.map((player) =>
      this.mapLineupPlayer(player, athleteCatalog, market, "reserve")
    );

    return {
      participantDbId: participant.id,
      participantStaticId: participant.staticId,
      roundNumber: requestedRoundNumber,
      totalPoints: typeof lineup.pontos === "number" ? lineup.pontos : 0,
      captainId: lineup.capitao_id ?? null,
      reserveLuxuryId: lineup.reserva_luxo_id ?? null,
      starters,
      reserves,
      effectivePlayers: this.resolveEffectivePlayers(starters, reserves),
      rawPayloadRef: `team:${participant.cartolaTeamId}:round:${requestedRoundNumber}`
    };
  }

  private mapLineupPlayer(
    player: {
      atleta_id: number;
      apelido: string;
      pontos_num?: number | null;
      posicao_id: number;
      clube_id: number;
      entrou_em_campo?: boolean | null;
    },
    athleteCatalog: Map<number, AthleteCatalogEntry>,
    market: CartolaAthletesMarketPayload | null,
    source: "starter" | "reserve"
  ): NormalizedPlayer {
    const catalogEntry = athleteCatalog.get(player.atleta_id);

    return {
      athleteId: player.atleta_id,
      playerName: catalogEntry?.name ?? player.apelido,
      clubName: catalogEntry
        ? market?.clubes[String(catalogEntry.clubId)]?.nome ?? String(catalogEntry.clubId)
        : null,
      positionName: catalogEntry
        ? market?.posicoes[String(catalogEntry.positionId)]?.nome ??
          String(catalogEntry.positionId)
        : null,
      positionId: player.posicao_id,
      points: typeof player.pontos_num === "number" ? player.pontos_num : 0,
      entered: player.entrou_em_campo !== false,
      source
    };
  }

  private resolveEffectivePlayers(starters: NormalizedPlayer[], reserves: NormalizedPlayer[]) {
    const effectivePlayers = starters.filter((player) => player.entered);
    const unusedReserves = [...reserves];

    for (const starter of starters.filter((player) => !player.entered)) {
      const reserveIndex = unusedReserves.findIndex(
        (reserve) =>
          reserve.entered && reserve.positionId === starter.positionId
      );

      if (reserveIndex >= 0) {
        effectivePlayers.push(unusedReserves[reserveIndex]!);
        unusedReserves.splice(reserveIndex, 1);
      }
    }

    return effectivePlayers;
  }

  private getOfficialRoundNumber(
    lineupsByRound: Record<number, NormalizedLineup[]>,
    currentRoundNumber: number
  ) {
    return GROUP_STAGE_ROUNDS.filter((roundNumber) => roundNumber <= currentRoundNumber)
      .filter((roundNumber) => (lineupsByRound[roundNumber] ?? []).length > 0)
      .reduce((maxRound, roundNumber) => Math.max(maxRound, roundNumber), 0);
  }

  private buildMatches({
    currentRoundNumber,
    officialRoundNumber,
    isLiveRound,
    fixtures,
    lineupsByRound
  }: {
    currentRoundNumber: number;
    officialRoundNumber: number;
    isLiveRound: boolean;
    fixtures: Awaited<ReturnType<typeof cartolaClient.getFixtures>>;
    lineupsByRound: Record<number, NormalizedLineup[]>;
  }) {
    const currentFixtureMatches = this.mapCurrentRoundFixtures(fixtures);
    const matches: SyncPublicMatch[] = [];

    for (const roundNumber of GROUP_STAGE_ROUNDS) {
      const baseMatches =
        roundNumber === currentRoundNumber && currentFixtureMatches.length > 0
          ? currentFixtureMatches
          : this.buildRoundTemplates(roundNumber);
      const pointsByParticipantId = new Map(
        (lineupsByRound[roundNumber] ?? []).map((lineup) => [
          lineup.participantStaticId,
          lineup.totalPoints
        ])
      );
      const roundState =
        roundNumber < currentRoundNumber && roundNumber <= officialRoundNumber
          ? "official"
          : roundNumber === currentRoundNumber
            ? isLiveRound
              ? "partial"
              : roundNumber <= officialRoundNumber
                ? "official"
                : "scheduled"
            : "scheduled";

      for (const match of baseMatches) {
        matches.push({
          ...match,
          state: roundState,
          homePoints:
            roundState === "scheduled"
              ? null
              : Number(
                  (pointsByParticipantId.get(match.homeParticipantId) ?? 0).toFixed(2)
                ),
          awayPoints:
            roundState === "scheduled"
              ? null
              : Number(
                  (pointsByParticipantId.get(match.awayParticipantId) ?? 0).toFixed(2)
                )
        });
      }
    }

    return matches;
  }

  private buildRoundTemplates(roundNumber: number) {
    const pairings = ROUND_PAIRINGS[roundNumber] ?? [];

    return groups.flatMap((group) =>
      pairings.map(([homeIndex, awayIndex], matchIndex) => {
        const home = group.participants[homeIndex]!;
        const away = group.participants[awayIndex]!;

        return {
          id: `${group.code}-r${roundNumber}-m${matchIndex + 1}`,
          phase: "groups",
          phaseSlot: `${group.code}-r${roundNumber}-m${matchIndex + 1}`,
          groupCode: group.code,
          roundNumber,
          homeParticipantId: home.id,
          awayParticipantId: away.id,
          homePoints: null,
          awayPoints: null
        };
      })
    );
  }

  private mapCurrentRoundFixtures(fixtures: Awaited<ReturnType<typeof cartolaClient.getFixtures>>) {
    return fixtures.partidas.flatMap((fixture, index) => {
      const home = resolveParticipantByCountry(
        fixtures.clubes[String(fixture.clube_casa_id)]?.nome ?? ""
      );
      const away = resolveParticipantByCountry(
        fixtures.clubes[String(fixture.clube_visitante_id)]?.nome ?? ""
      );

      if (!home || !away) {
        return [];
      }

      return [
        {
          id: String(fixture.partida_id),
          phase: "groups",
          phaseSlot: `${home.groupCode}-r${fixtures.rodada}-m${index + 1}`,
          groupCode: home.groupCode,
          roundNumber: fixtures.rodada,
          homeParticipantId: home.id,
          awayParticipantId: away.id,
          homePoints: null,
          awayPoints: null
        }
      ];
    });
  }

  private buildStandingsForRound(
    matches: SyncPublicMatch[],
    roundNumber: number,
    roundState: "partial" | "official" | "scheduled"
  ) {
    if (roundState === "scheduled") {
      return [];
    }

    const effectiveMatches = matches.filter(
      (match) =>
        match.roundNumber <= roundNumber &&
        match.homePoints !== null &&
        match.awayPoints !== null
    );

    return groups.flatMap((group) => {
      const groupMatches = effectiveMatches.filter(
        (match) => match.groupCode === group.code
      );
      const standingInput: GroupMatch[] = groupMatches.map((match) => ({
        homeParticipantId: match.homeParticipantId,
        awayParticipantId: match.awayParticipantId,
        homePoints: match.homePoints ?? 0,
        awayPoints: match.awayPoints ?? 0
      }));
      const computed = calculateGroupStandings(standingInput);

      return computed.map((standing, index) => ({
        participantId: standing.participantId,
        points: standing.points,
        wins: standing.wins,
        draws: standing.draws,
        losses: standing.losses,
        pointsFor: Number(standing.pointsFor.toFixed(2)),
        pointsAgainst: Number(standing.pointsAgainst.toFixed(2)),
        pointsDifference: Number(standing.pointsDifference.toFixed(2)),
        position: index + 1,
        statusLabel:
          index < 2 ? "qualified" : index === 2 ? "in_contention" : "eliminated"
      }));
    });
  }

  private resolveResultType(homePoints: number, awayPoints: number) {
    if (Math.abs(homePoints - awayPoints) <= 5) {
      return "draw";
    }

    return homePoints > awayPoints ? "home_win" : "away_win";
  }

  private resolveCurrentRoundFromRows(
    rounds: Array<{
      external_round_id: number;
      status: string;
      name?: string;
      officialized_at?: string | null;
      last_synced_at?: string | null;
    }>
  ) {
    const liveRound = rounds.find((round) => round.status === "live");

    if (liveRound) {
      return liveRound;
    }

    const officialRoundNumber = rounds
      .filter((round) => round.status === "official")
      .reduce((maxRound, round) => Math.max(maxRound, round.external_round_id), 0);

    const nextScheduledRound = rounds
      .filter((round) => round.status === "scheduled")
      .sort((left, right) => left.external_round_id - right.external_round_id)
      .find((round) => round.external_round_id > officialRoundNumber);

    return (
      nextScheduledRound ??
      rounds.sort((left, right) => right.external_round_id - left.external_round_id)[0] ??
      null
    );
  }

  private formatRoundLabel(roundNumber: number) {
    return `${roundNumber}a rodada`;
  }
}
