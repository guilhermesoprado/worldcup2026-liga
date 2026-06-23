import { buildMostPicked } from "@/domain/sync/build-most-picked";
import {
  buildAthletePartialIndex,
  buildStartedClubIds,
  buildOfficialLineupSnapshot,
  buildPartialLineupSnapshot,
  type NormalizedLineup
} from "@/domain/sync/lineup-score";
import { formatRoundLabel, resolveMarketState } from "@/domain/sync/market-state";
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
import { LineupSnapshotRepository } from "@/server/repositories/lineup-snapshot.repository";
import { MatchRepository } from "@/server/repositories/match.repository";
import { MostPickedRepository } from "@/server/repositories/most-picked.repository";
import { ParticipantRepository } from "@/server/repositories/participant.repository";
import { RoundRepository, type RoundStatus } from "@/server/repositories/round.repository";
import { StandingsSnapshotRepository } from "@/server/repositories/standings-snapshot.repository";
import { SyncConfigRepository } from "@/server/repositories/sync-config.repository";
import { SyncExecutionRepository } from "@/server/repositories/sync-execution.repository";

type SyncTriggerType = "automatic_access" | "manual_admin";
type SyncMode = "default" | "officialized_only";

type SyncParticipant = {
  id: string;
  groupId: string | null;
  cartolaTeamId: number;
  staticId: string;
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

type RoundProcessingState = "partial" | "official";

type ProcessedRound = {
  matches: SyncPublicMatch[];
  lineups: Array<
    NormalizedLineup & {
      participantDbId: string;
      participantStaticId: string;
      rawPayloadRef: string;
    }
  >;
  state: RoundProcessingState;
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

  async runOfficializedRoundsSync() {
    return this.runSync("manual_admin", "officialized_only");
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
      this.roundRepository.listAll(),
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

  private async runSync(triggerType: SyncTriggerType, mode: SyncMode = "default") {
    const startedAt = new Date().toISOString();

    try {
      const [marketStatus, fixtures, athletesMarket, athletesScored, participants, persistedRounds] =
        await Promise.all([
          cartolaClient.getMarketStatus(),
          cartolaClient.getFixtures(),
          cartolaClient.getAthletesMarket().catch(() => null),
          cartolaClient.getAthletesScored().catch(() => null),
          this.getParticipantsForSync(),
          this.roundRepository.listAll()
        ]);

      const marketState = resolveMarketState(marketStatus);

      if (!marketState.shouldForceSync) {
        const execution = await this.syncExecutionRepository.create({
          triggerType,
          status: "skipped",
          summaryMessage: `Sync ignorado para status_mercado=${marketState.marketStatusCode}. Ultimo snapshot confiavel preservado.`,
          startedAt,
          finishedAt: new Date().toISOString()
        });

        return { execution, currentRoundNumber: marketState.displayRoundNumber };
      }

      const athleteCatalog = athletesMarket
        ? mapAthleteCatalog(athletesMarket)
        : new Map();
      const officialRoundsToBackfill = GROUP_STAGE_ROUNDS.filter((roundNumber) =>
        roundNumber <= marketState.officialRoundNumber &&
        (
          mode === "officialized_only" ||
          !this.isOfficialRoundPersisted(roundNumber, persistedRounds)
        )
      );
      const roundsToProcess =
        mode === "officialized_only"
          ? officialRoundsToBackfill
          : [
              ...officialRoundsToBackfill,
              ...(marketState.partialRoundNumber !== null
                ? [marketState.partialRoundNumber]
                : [])
            ].filter((roundNumber, index, values) => values.indexOf(roundNumber) === index);

      if (roundsToProcess.length === 0) {
        const persistedRows = await this.persistRounds({
          persistedRounds,
          currentRoundNumber: marketState.apiCurrentRoundNumber,
          officialRoundNumber: marketState.officialRoundNumber,
          partialRoundNumber: marketState.partialRoundNumber,
          marketStatusCode: String(marketState.marketStatusCode),
          processedRoundNumbers: []
        });

        const execution = await this.syncExecutionRepository.create({
          triggerType,
          status: "skipped",
          summaryMessage: `${
            mode === "officialized_only"
              ? "Nenhuma rodada oficializada precisou de reprocessamento."
              : "Nenhuma rodada precisou de reprocessamento."
          } Estado oficial atual: ${
            marketState.officialRoundNumber > 0
              ? formatRoundLabel(marketState.officialRoundNumber)
              : "nenhuma rodada oficial"
          }.`,
          startedAt,
          finishedAt: new Date().toISOString(),
          affectedRoundId:
            persistedRows.find(
              (round) => round.external_round_id === marketState.displayRoundNumber
            )?.id ?? null
        });

        return { execution, currentRoundNumber: marketState.displayRoundNumber };
      }

      const persistedMatches = await this.matchRepository.listAll();
      const roundsAfterPersist = await this.persistRounds({
        persistedRounds,
        currentRoundNumber: marketState.apiCurrentRoundNumber,
        officialRoundNumber: marketState.officialRoundNumber,
        partialRoundNumber: marketState.partialRoundNumber,
        marketStatusCode: String(marketState.marketStatusCode),
        processedRoundNumbers: roundsToProcess
      });
      const roundByNumber = new Map(
        roundsAfterPersist.map((round) => [round.external_round_id, round])
      );
      const persistedRoundIdToNumber = new Map(
        roundsAfterPersist.map((round) => [round.id, round.external_round_id])
      );
      const persistedOfficialMatchesByRound = new Map<number, SyncPublicMatch[]>();

      for (const match of persistedMatches) {
        const roundNumber = persistedRoundIdToNumber.get(match.round_id);
        const homeParticipant = participants.find(
          (participant) => participant.id === match.home_participant_id
        );
        const awayParticipant = participants.find(
          (participant) => participant.id === match.away_participant_id
        );

        if (!roundNumber || match.state !== "official" || !homeParticipant || !awayParticipant) {
          continue;
        }

        const current = persistedOfficialMatchesByRound.get(roundNumber) ?? [];
        current.push({
          id: match.id,
          phase: match.phase,
          phaseSlot: match.phase_slot,
          groupCode: this.resolveGroupCodeForParticipant(homeParticipant.staticId),
          roundNumber,
          state: "official",
          homeParticipantId: homeParticipant.staticId,
          awayParticipantId: awayParticipant.staticId,
          homePoints:
            typeof match.home_points === "number" ? Number(match.home_points) : null,
          awayPoints:
            typeof match.away_points === "number" ? Number(match.away_points) : null
        });
        persistedOfficialMatchesByRound.set(roundNumber, current);
      }

      const partialIndex = buildAthletePartialIndex(athletesScored);
      const startedClubIds = buildStartedClubIds(fixtures);
      const processedRounds = new Map<number, ProcessedRound>();

      for (const roundNumber of [...roundsToProcess].sort((left, right) => left - right)) {
        const state: RoundProcessingState =
          marketState.partialRoundNumber === roundNumber ? "partial" : "official";
        const lineups = await this.loadLineupsForRound({
          roundNumber,
          state,
          participants,
          athleteCatalog,
          market: athletesMarket,
          partialIndex,
          startedClubIds
        });
        const matches = this.buildMatchesForRound({
          roundNumber,
          state,
          fixtures,
          lineups
        });

        processedRounds.set(roundNumber, {
          matches,
          lineups,
          state
        });
      }

      for (const roundNumber of [...processedRounds.keys()].sort((left, right) => left - right)) {
        const processedRound = processedRounds.get(roundNumber)!;
        const round = roundByNumber.get(roundNumber);

        if (!round) {
          continue;
        }

        const standings = this.buildStandingsForRound({
          roundNumber,
          processedRounds,
          persistedOfficialMatchesByRound
        });

        await this.matchRepository.replaceRoundMatches(
          round.id,
          processedRound.matches.map((match) => ({
            phase: match.phase,
            phaseSlot: match.phaseSlot,
            groupId:
              participants.find((participant) => participant.staticId === match.homeParticipantId)
                ?.groupId ?? null,
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
            state: processedRound.state,
            decidedByRule:
              match.homePoints === null || match.awayPoints === null
                ? "score"
                : Math.abs(match.homePoints - match.awayPoints) <= 5
                  ? "draw_threshold"
                  : "score"
          }))
        );

        await this.standingsSnapshotRepository.replaceRoundSnapshots(
          round.id,
          standings.map((standing) => ({
            scope: "group",
            phase: "groups",
            groupId:
              participants.find((participant) => participant.staticId === standing.participantId)
                ?.groupId ?? null,
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
            state: processedRound.state
          }))
        );

        await this.lineupSnapshotRepository.replaceRoundSnapshots(
          round.id,
          processedRound.lineups.map((lineup) => ({
            participantId: lineup.participantDbId,
            roundId: round.id,
            captainId: lineup.captainId,
            reserveLuxuryId: lineup.reserveLuxuryId,
            captainName: this.resolveCaptainName(lineup),
            coachName: this.resolveCoachName(lineup),
            formationLabel: this.resolveFormationLabel(lineup),
            totalPoints: lineup.totalPoints,
            state: processedRound.state,
            rawPayloadRef: lineup.rawPayloadRef,
            players: [
              ...lineup.starters.map((player) => ({
                athleteId: player.athleteId,
                playerName: player.playerName,
                photoUrl: player.photoUrl,
                clubName: player.clubName,
                positionName: player.positionName,
                captainMultiplier: lineup.captainId === player.athleteId ? 1 : 1,
                points: player.points,
                statusLabel: player.entered
                  ? "starter_counting"
                  : player.matchStarted
                    ? "starter_absent"
                    : "starter_waiting",
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
                photoUrl: player.photoUrl,
                clubName: player.clubName,
                positionName: player.positionName,
                captainMultiplier: 1,
                points: player.points,
                statusLabel: lineup.effectivePlayers.some(
                  (effectivePlayer) =>
                    effectivePlayer.athleteId === player.athleteId &&
                    effectivePlayer.source === "reserve"
                )
                  ? "reserve_counting"
                  : player.entered
                    ? player.points > 0
                      ? "reserve_unused_positive"
                      : "reserve_negative"
                    : player.matchStarted
                      ? "reserve_absent"
                      : "reserve_waiting",
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
          processedRound.lineups.map((lineup) =>
            lineup.starters.map((player) => ({
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
            state: processedRound.state
          }))
        );
      }

      const affectedRoundNumber =
        marketState.partialRoundNumber ?? marketState.officialRoundNumber;
      const affectedRound = roundByNumber.get(affectedRoundNumber) ?? null;
      const execution = await this.syncExecutionRepository.create({
        triggerType,
        status: "success",
        summaryMessage:
          mode === "officialized_only"
            ? `Sincronizacao de rodadas oficializadas concluida com ${roundsToProcess.length} rodada(s) processada(s).`
            : `Sync concluido para ${formatRoundLabel(marketState.displayRoundNumber)} com ${roundsToProcess.length} rodada(s) processada(s).`,
        startedAt,
        finishedAt: new Date().toISOString(),
        affectedRoundId: affectedRound?.id ?? null
      });

      return {
        execution,
        currentRoundNumber: marketState.displayRoundNumber
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

  private isOfficialRoundPersisted(
    roundNumber: number,
    persistedRounds: Awaited<ReturnType<RoundRepository["listAll"]>>
  ) {
    const round = persistedRounds.find((item) => item.external_round_id === roundNumber);
    return round?.status === "official" && Boolean(round.last_synced_at);
  }

  private async persistRounds({
    persistedRounds,
    currentRoundNumber,
    officialRoundNumber,
    partialRoundNumber,
    marketStatusCode,
    processedRoundNumbers
  }: {
    persistedRounds: Awaited<ReturnType<RoundRepository["listAll"]>>;
    currentRoundNumber: number;
    officialRoundNumber: number;
    partialRoundNumber: number | null;
    marketStatusCode: string;
    processedRoundNumbers: number[];
  }) {
    const syncedAt = new Date().toISOString();
    const processedSet = new Set(processedRoundNumbers);

    return Promise.all(
      GROUP_STAGE_ROUNDS.map((roundNumber) => {
        const existing = persistedRounds.find((round) => round.external_round_id === roundNumber);
        const status = this.resolveRoundStatus({
          roundNumber,
          officialRoundNumber,
          partialRoundNumber
        });

        return this.roundRepository.upsert({
          externalRoundId: roundNumber,
          name: formatRoundLabel(roundNumber),
          status,
          marketStatus: marketStatusCode,
          officializedAt:
            status === "official" ? existing?.officialized_at ?? syncedAt : null,
          lastSyncedAt: processedSet.has(roundNumber)
            ? syncedAt
            : existing?.last_synced_at ?? null,
          sourceVersion: processedSet.has(roundNumber)
            ? [
                `current:${currentRoundNumber}`,
                `official:${officialRoundNumber}`,
                `partial:${partialRoundNumber ?? "none"}`,
                `market:${marketStatusCode}`
              ].join("|")
            : existing?.source_version ?? null
        });
      })
    );
  }

  private resolveRoundStatus({
    roundNumber,
    officialRoundNumber,
    partialRoundNumber
  }: {
    roundNumber: number;
    officialRoundNumber: number;
    partialRoundNumber: number | null;
  }): RoundStatus {
    if (partialRoundNumber !== null && roundNumber === partialRoundNumber) {
      return "live";
    }

    if (roundNumber <= officialRoundNumber) {
      return "official";
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
        staticParticipants.find((item) => item.cartolaTeamId === participant.cartola_team_id) ??
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
        cartolaTeamId: participant.cartola_team_id,
        staticId: staticParticipant.id
      };
    });
  }

  private async loadLineupsForRound({
    roundNumber,
    state,
    participants,
    athleteCatalog,
    market,
    partialIndex,
    startedClubIds
  }: {
    roundNumber: number;
    state: RoundProcessingState;
    participants: SyncParticipant[];
    athleteCatalog: Map<number, ReturnType<typeof mapAthleteCatalog> extends Map<number, infer T> ? T : never>;
    market: CartolaAthletesMarketPayload | null;
    partialIndex: ReturnType<typeof buildAthletePartialIndex>;
    startedClubIds: Set<number>;
  }) {
    const results = await Promise.allSettled(
      participants.map((participant) => cartolaClient.getTeamById(participant.cartolaTeamId, roundNumber))
    );

    return results.flatMap((result, index) => {
      if (result.status === "rejected") {
        return [];
      }

      const participant = participants[index]!;
      const normalized = this.normalizeLineupSnapshot({
        requestedRoundNumber: roundNumber,
        lineup: result.value,
        athleteCatalog,
        market,
        partialIndex,
        startedClubIds,
        state
      });

      if (!normalized) {
        return [];
      }

      return [
        {
          ...normalized,
          participantDbId: participant.id,
          participantStaticId: participant.staticId,
          rawPayloadRef: `team:${participant.cartolaTeamId}:round:${roundNumber}`
        }
      ];
    });
  }

  private normalizeLineupSnapshot({
    requestedRoundNumber,
    lineup,
    athleteCatalog,
    market,
    partialIndex,
    startedClubIds,
    state
  }: {
    requestedRoundNumber: number;
    lineup: CartolaLineupPayload;
    athleteCatalog: Map<number, ReturnType<typeof mapAthleteCatalog> extends Map<number, infer T> ? T : never>;
    market: CartolaAthletesMarketPayload | null;
    partialIndex: ReturnType<typeof buildAthletePartialIndex>;
    startedClubIds: Set<number>;
    state: RoundProcessingState;
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

    // Partial lineups can arrive with stale or mixed `rodada_id` values even when
    // the roster itself is the current valid lineup. Only reject explicit round
    // mismatches for official snapshots, where the API response must be fixed.
    if (
      state === "official" &&
      detectedRound !== null &&
      detectedRound !== requestedRoundNumber
    ) {
      return null;
    }

    if (state === "partial") {
      return buildPartialLineupSnapshot({
        roundNumber: requestedRoundNumber,
        lineup,
        athleteCatalog,
        market,
        partialIndex,
        startedClubIds
      });
    }

    return buildOfficialLineupSnapshot({
      roundNumber: requestedRoundNumber,
      lineup,
      athleteCatalog,
      market
    });
  }

  private buildMatchesForRound({
    roundNumber,
    state,
    fixtures,
    lineups
  }: {
    roundNumber: number;
    state: RoundProcessingState;
    fixtures: Awaited<ReturnType<typeof cartolaClient.getFixtures>>;
    lineups: Array<
      NormalizedLineup & {
        participantDbId: string;
        participantStaticId: string;
        rawPayloadRef: string;
      }
    >;
  }) {
    const baseMatches =
      state === "partial" && fixtures.rodada === roundNumber
        ? this.mapCurrentRoundFixtures(fixtures)
        : this.buildRoundTemplates(roundNumber);
    const pointsByParticipantId = new Map(
      lineups.map((lineup) => [lineup.participantStaticId, lineup.totalPoints])
    );

    return baseMatches.map((match) => ({
      ...match,
      state,
      homePoints: Number((pointsByParticipantId.get(match.homeParticipantId) ?? 0).toFixed(2)),
      awayPoints: Number((pointsByParticipantId.get(match.awayParticipantId) ?? 0).toFixed(2))
    }));
  }

  private buildStandingsForRound({
    roundNumber,
    processedRounds,
    persistedOfficialMatchesByRound
  }: {
    roundNumber: number;
    processedRounds: Map<number, ProcessedRound>;
    persistedOfficialMatchesByRound: Map<number, SyncPublicMatch[]>;
  }) {
    const effectiveMatches: SyncPublicMatch[] = [];

    for (const currentRound of GROUP_STAGE_ROUNDS.filter((value) => value <= roundNumber)) {
      const processed = processedRounds.get(currentRound);

      if (processed) {
        effectiveMatches.push(...processed.matches);
        continue;
      }

      effectiveMatches.push(...(persistedOfficialMatchesByRound.get(currentRound) ?? []));
    }

    return groups.flatMap((group) => {
      const groupMatches = effectiveMatches.filter((match) => match.groupCode === group.code);
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

  private resolveGroupCodeForParticipant(staticParticipantId: string) {
    return groups.find((group) =>
      group.participants.some((participant) => participant.id === staticParticipantId)
    )?.code ?? null;
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

    const officialRound = [...rounds]
      .filter((round) => round.status === "official")
      .sort((left, right) => right.external_round_id - left.external_round_id)[0];

    if (officialRound) {
      return officialRound;
    }

    return rounds.sort((left, right) => left.external_round_id - right.external_round_id)[0] ?? null;
  }

  private resolveCaptainName(lineup: NormalizedLineup) {
    if (lineup.captainId === null) {
      return null;
    }

    return (
      [...lineup.starters, ...lineup.reserves].find(
        (player) => player.athleteId === lineup.captainId
      )?.playerName ?? null
    );
  }

  private resolveCoachName(lineup: NormalizedLineup) {
    return lineup.starters.find((player) => player.positionId === 6)?.playerName ?? null;
  }

  private resolveFormationLabel(lineup: NormalizedLineup) {
    const counts = lineup.starters.reduce(
      (acc, player) => {
        if (player.positionId === 2) acc.defense += 1;
        if (player.positionId === 3) acc.defense += 1;
        if (player.positionId === 4) acc.midfield += 1;
        if (player.positionId === 5) acc.attack += 1;
        return acc;
      },
      { defense: 0, midfield: 0, attack: 0 }
    );

    return `${counts.defense}-${counts.midfield}-${counts.attack}`;
  }
}
