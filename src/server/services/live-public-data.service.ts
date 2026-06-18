import { buildMostPicked } from "@/domain/sync/build-most-picked";
import {
  calculateGroupStandings,
  type GroupMatch
} from "@/domain/standings/calculate-group-standings";
import {
  groups,
  participants,
  publicMostPickedPlayers,
  publicMatches,
  publicStandingsByGroup,
  resolveParticipantByCountry
} from "@/domain/participants/static-league-data";
import { cartolaClient } from "@/lib/cartola/client";
import { mapAthleteCatalog } from "@/lib/cartola/mappers";
import type { CartolaLineupPayload } from "@/lib/cartola/mappers";
import { PersistedPublicSnapshotService } from "@/server/services/persisted-public-snapshot.service";
import { SyncService } from "@/server/services/sync.service";
import type {
  PublicMatch,
  PublicMostPickedPlayer,
  PublicStanding
} from "@/types/public";
import { getOptionalCartolaEnv } from "@/types/env";

type LiveSnapshot = {
  phase: string;
  phaseLabel: string;
  completedMatches: number;
  totalMatches: number;
  currentRoundNumber: number;
  currentRoundLabel: string;
  standingsRoundNumber: number;
  standingsRoundLabel: string;
  stateLabel: string;
  groups: { code: string; displayName: string }[];
  availableRounds: number[];
  standingsByGroup: Record<string, PublicStanding[]>;
  matches: PublicMatch[];
  mostPickedByRound: Record<string, PublicMostPickedPlayer[]>;
  usesLiveData: boolean;
};

type CachedSnapshot = {
  expiresAt: number;
  snapshot: LiveSnapshot;
};

type LineupPlayer = {
  athleteId: number;
  playerName: string;
  clubName: string | null;
  positionName: string | null;
  positionId: number;
  entered: boolean;
  roundId: number | null;
};

type RoundLineupSnapshot = {
  participantId: string;
  roundNumber: number;
  totalPoints: number;
  players: LineupPlayer[];
};

type MatchTemplate = {
  id: string;
  phase: string;
  groupCode: string;
  roundNumber: number;
  homeParticipantId: string;
  awayParticipantId: string;
  homeCountry: string;
  awayCountry: string;
  homeOwner: string;
  awayOwner: string;
  homeCartolaTeamName: string;
  awayCartolaTeamName: string;
  kickoffLabel: string;
};

const CACHE_TTL_MS = 30_000;
const GROUP_STAGE_TOTAL_MATCHES = 72;
const GROUP_STAGE_ROUNDS = [1, 2, 3] as const;
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

let cachedSnapshot: CachedSnapshot | null = null;

export class LivePublicDataService {
  private readonly persistedPublicSnapshotService = new PersistedPublicSnapshotService();
  private readonly syncService = new SyncService();

  async getSnapshot(): Promise<LiveSnapshot> {
    await this.syncService.runAccessDrivenSyncIfDue().catch(() => null);

    const persistedSnapshot = await this.persistedPublicSnapshotService.getSnapshot();

    if (persistedSnapshot) {
      return persistedSnapshot;
    }

    if (cachedSnapshot && cachedSnapshot.expiresAt > Date.now()) {
      return cachedSnapshot.snapshot;
    }

    const liveSnapshot = await this.buildLiveSnapshot();
    const snapshot = liveSnapshot ?? this.buildFallbackSnapshot();

    cachedSnapshot = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      snapshot
    };

    return snapshot;
  }

  private async buildLiveSnapshot(): Promise<LiveSnapshot | null> {
    if (!getOptionalCartolaEnv()) {
      return null;
    }

    try {
      const [marketStatus, fixtures, market, athletesScored] = await Promise.all([
        cartolaClient.getMarketStatus(),
        cartolaClient.getFixtures(),
        cartolaClient.getAthletesMarket().catch(() => null),
        cartolaClient.getAthletesScored().catch(() => null)
      ]);

      const athleteCatalog = market
        ? mapAthleteCatalog(market)
        : new Map<number, { name: string; clubId: number; positionId: number }>();
      const currentRoundNumber = marketStatus.rodada_atual;
      const currentRoundLabel = this.formatRoundLabel(currentRoundNumber);
      const hasLiveAthleteScores = Boolean(
        athletesScored && Object.keys(athletesScored.atletas).length > 0
      );
      const isLiveRound = marketStatus.bola_rolando && hasLiveAthleteScores;

      const lineupsByRound = await this.loadLineupsByRound(
        currentRoundNumber,
        athleteCatalog,
        market
      );

      const officialRoundNumber = this.getOfficialRoundNumber(
        lineupsByRound,
        currentRoundNumber
      );
      const standingsRoundNumber = isLiveRound
        ? currentRoundNumber
        : officialRoundNumber;
      const standingsRoundLabel =
        standingsRoundNumber > 0
          ? this.formatRoundLabel(standingsRoundNumber)
          : "nenhuma rodada";

      const matches = this.buildMatches({
        currentRoundNumber,
        fixtures,
        lineupsByRound,
        officialRoundNumber,
        isLiveRound
      });

      const standingsByGroup = this.buildStandingsByGroup(
        matches,
        standingsRoundNumber
      );
      const mostPickedByRound = this.buildMostPickedByRound(lineupsByRound);

      return {
        phase: "groups",
        phaseLabel: "Fase de grupos",
        completedMatches: matches.filter((match) => match.state !== "scheduled").length,
        totalMatches: GROUP_STAGE_TOTAL_MATCHES,
        currentRoundNumber,
        currentRoundLabel,
        standingsRoundNumber,
        standingsRoundLabel,
        stateLabel: this.buildStateLabel({
          currentRoundNumber,
          officialRoundNumber,
          isLiveRound
        }),
        groups: groups.map((group) => ({
          code: group.code,
          displayName: group.displayName
        })),
        availableRounds: [...GROUP_STAGE_ROUNDS],
        standingsByGroup,
        matches,
        mostPickedByRound,
        usesLiveData: true
      };
    } catch {
      return null;
    }
  }

  private async loadLineupsByRound(
    currentRoundNumber: number,
    athleteCatalog: Map<number, { name: string; clubId: number; positionId: number }>,
    market:
      | {
          clubes: Record<string, { id: number; nome: string }>;
          posicoes: Record<string, { id: number; nome: string; abreviacao: string }>;
        }
      | null
  ) {
    const lineupsByRound: Record<number, RoundLineupSnapshot[]> = {};

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
              participantId: participant.id,
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
    participantId,
    athleteCatalog,
    market
  }: {
    requestedRoundNumber: number;
    currentRoundNumber: number;
    lineup: CartolaLineupPayload;
    participantId: string;
    athleteCatalog: Map<number, { name: string; clubId: number; positionId: number }>;
    market:
      | {
          clubes: Record<string, { id: number; nome: string }>;
          posicoes: Record<string, { id: number; nome: string; abreviacao: string }>;
        }
      | null;
  }): RoundLineupSnapshot | null {
    const allPlayers = [...lineup.atletas, ...lineup.reservas];
    const detectedRounds = [...new Set(allPlayers.map((player) => player.rodada_id).filter(
      (roundId): roundId is number => typeof roundId === "number"
    ))];
    const detectedRound =
      detectedRounds.length === 1 ? detectedRounds[0] : null;

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
      this.mapLineupPlayer(player, athleteCatalog, market)
    );
    const reserves = lineup.reservas.map((player) =>
      this.mapLineupPlayer(player, athleteCatalog, market)
    );

    return {
      participantId,
      roundNumber: requestedRoundNumber,
      totalPoints:
        typeof lineup.pontos === "number"
          ? lineup.pontos
          : 0,
      players: this.resolveEffectivePlayers(starters, reserves)
    };
  }

  private mapLineupPlayer(
    player: {
      atleta_id: number;
      apelido: string;
      pontos_num?: number | null;
      posicao_id: number;
      clube_id: number;
      rodada_id?: number | null;
      entrou_em_campo?: boolean | null;
    },
    athleteCatalog: Map<number, { name: string; clubId: number; positionId: number }>,
    market:
      | {
          clubes: Record<string, { id: number; nome: string }>;
          posicoes: Record<string, { id: number; nome: string; abreviacao: string }>;
        }
      | null
  ): LineupPlayer {
    const catalogEntry = athleteCatalog.get(player.atleta_id);

    return {
      athleteId: player.atleta_id,
      playerName: catalogEntry?.name ?? player.apelido,
      clubName: catalogEntry
        ? market?.clubes[String(catalogEntry.clubId)]?.nome ??
          String(catalogEntry.clubId)
        : null,
      positionName: catalogEntry
        ? market?.posicoes[String(catalogEntry.positionId)]?.nome ??
          String(catalogEntry.positionId)
        : null,
      positionId: player.posicao_id,
      entered: player.entrou_em_campo !== false,
      roundId: player.rodada_id ?? null
    };
  }

  private resolveEffectivePlayers(
    starters: LineupPlayer[],
    reserves: LineupPlayer[]
  ) {
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
    lineupsByRound: Record<number, RoundLineupSnapshot[]>,
    currentRoundNumber: number
  ) {
    return GROUP_STAGE_ROUNDS.filter((roundNumber) => roundNumber <= currentRoundNumber)
      .filter((roundNumber) => (lineupsByRound[roundNumber] ?? []).length > 0)
      .reduce((maxRound, roundNumber) => Math.max(maxRound, roundNumber), 0);
  }

  private buildMatches({
    currentRoundNumber,
    fixtures,
    lineupsByRound,
    officialRoundNumber,
    isLiveRound
  }: {
    currentRoundNumber: number;
    fixtures: {
      rodada: number;
      clubes: Record<
        string,
        {
          id: number;
          nome: string;
          abreviacao: string;
          slug: string;
          escudos: Record<string, string>;
        }
      >;
      partidas: {
        partida_id: number;
        clube_casa_id: number;
        clube_visitante_id: number;
        partida_data: string;
        timestamp?: number;
        valida: boolean;
        placar_oficial_mandante: number | null;
        placar_oficial_visitante: number | null;
      }[];
    };
    lineupsByRound: Record<number, RoundLineupSnapshot[]>;
    officialRoundNumber: number;
    isLiveRound: boolean;
  }) {
    const currentFixtureMatches = this.mapCurrentRoundFixtures(fixtures);
    const matches: PublicMatch[] = [];

    for (const roundNumber of GROUP_STAGE_ROUNDS) {
      const baseMatches =
        roundNumber === currentRoundNumber && currentFixtureMatches.length > 0
          ? currentFixtureMatches
          : this.buildRoundTemplates(roundNumber);
      const pointsByParticipantId = new Map(
        (lineupsByRound[roundNumber] ?? []).map((lineup) => [
          lineup.participantId,
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

  private buildStandingsByGroup(
    matches: PublicMatch[],
    standingsRoundNumber: number
  ) {
    const effectiveMatches = matches.filter(
      (match) =>
        match.roundNumber <= standingsRoundNumber &&
        match.homePoints !== null &&
        match.awayPoints !== null
    );

    return groups.reduce<Record<string, PublicStanding[]>>((acc, group) => {
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

      acc[group.code] = computed.map((standing, index) => {
        const participant = participants.find(
          (item) => item.id === standing.participantId
        )!;

        return {
          participantId: participant.id,
          country: participant.country,
          owner: participant.owner,
          cartolaTeamName: participant.cartolaTeamName,
          points: standing.points,
          matchesPlayed: standing.wins + standing.draws + standing.losses,
          wins: standing.wins,
          draws: standing.draws,
          losses: standing.losses,
          pointsFor: Number(standing.pointsFor.toFixed(2)),
          pointsAgainst: Number(standing.pointsAgainst.toFixed(2)),
          pointsDifference: Number(standing.pointsDifference.toFixed(2)),
          position: index + 1,
          statusLabel:
            index < 2
              ? "qualified"
              : index === 2
                ? "in_contention"
                : "eliminated"
        };
      });

      return acc;
    }, {});
  }

  private buildMostPickedByRound(
    lineupsByRound: Record<number, RoundLineupSnapshot[]>
  ) {
    const result: Record<string, PublicMostPickedPlayer[]> = {};

    for (const roundNumber of GROUP_STAGE_ROUNDS) {
      const roundLineups = lineupsByRound[roundNumber] ?? [];

      result[String(roundNumber)] = buildMostPicked(
        roundLineups.map((lineup) => lineup.players)
      )
        .slice(0, 12)
        .map((athlete) => ({
          athleteId: athlete.athleteId,
          playerName: athlete.playerName,
          clubName: athlete.clubName ?? "Sem clube",
          positionName: athlete.positionName ?? "Sem posicao",
          pickCount: athlete.pickCount,
          rankPosition: athlete.rankPosition
        }));
    }

    return result;
  }

  private buildRoundTemplates(roundNumber: number): MatchTemplate[] {
    const pairings = ROUND_PAIRINGS[roundNumber] ?? [];

    return groups.flatMap((group) =>
      pairings.map(([homeIndex, awayIndex], matchIndex) => {
        const home = group.participants[homeIndex]!;
        const away = group.participants[awayIndex]!;

        return {
          id: `${group.code}-r${roundNumber}-m${matchIndex + 1}`,
          phase: "groups",
          groupCode: group.code,
          roundNumber,
          homeParticipantId: home.id,
          awayParticipantId: away.id,
          homeCountry: home.country,
          awayCountry: away.country,
          homeOwner: home.owner,
          awayOwner: away.owner,
          homeCartolaTeamName: home.cartolaTeamName,
          awayCartolaTeamName: away.cartolaTeamName,
          kickoffLabel: this.formatRoundLabel(roundNumber)
        };
      })
    );
  }

  private mapCurrentRoundFixtures(fixtures: {
    rodada: number;
    clubes: Record<
      string,
      {
        id: number;
        nome: string;
        abreviacao: string;
        slug: string;
        escudos: Record<string, string>;
      }
    >;
    partidas: {
      partida_id: number;
      clube_casa_id: number;
      clube_visitante_id: number;
      partida_data: string;
      timestamp?: number;
      valida: boolean;
      placar_oficial_mandante: number | null;
      placar_oficial_visitante: number | null;
    }[];
  }): MatchTemplate[] {
    return fixtures.partidas.flatMap((fixture) => {
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
          groupCode: home.groupCode,
          roundNumber: fixtures.rodada,
          homeParticipantId: home.id,
          awayParticipantId: away.id,
          homeCountry: home.country,
          awayCountry: away.country,
          homeOwner: home.owner,
          awayOwner: away.owner,
          homeCartolaTeamName: home.cartolaTeamName,
          awayCartolaTeamName: away.cartolaTeamName,
          kickoffLabel: this.formatRoundLabel(fixtures.rodada)
        }
      ];
    });
  }

  private buildStateLabel({
    currentRoundNumber,
    officialRoundNumber,
    isLiveRound
  }: {
    currentRoundNumber: number;
    officialRoundNumber: number;
    isLiveRound: boolean;
  }) {
    if (isLiveRound) {
      return `Parcial da ${this.formatRoundLabel(currentRoundNumber)}`;
    }

    if (officialRoundNumber > 0 && officialRoundNumber < currentRoundNumber) {
      return `Oficial apos ${this.formatRoundLabel(officialRoundNumber)}`;
    }

    if (officialRoundNumber > 0) {
      return `Oficial da ${this.formatRoundLabel(officialRoundNumber)}`;
    }

    return "Aguardando dados oficiais";
  }

  private formatRoundLabel(roundNumber: number) {
    return `${roundNumber}a rodada`;
  }

  private buildFallbackSnapshot(): LiveSnapshot {
    return {
      phase: "groups",
      phaseLabel: "Fase de grupos",
      completedMatches: 24,
      totalMatches: GROUP_STAGE_TOTAL_MATCHES,
      currentRoundNumber: 1,
      currentRoundLabel: "1a rodada",
      standingsRoundNumber: 1,
      standingsRoundLabel: "1a rodada",
      stateLabel: "Parcial local",
      groups: groups.map((group) => ({
        code: group.code,
        displayName: group.displayName
      })),
      availableRounds: [...GROUP_STAGE_ROUNDS],
      standingsByGroup: publicStandingsByGroup,
      matches: publicMatches,
      mostPickedByRound: {
        "1": publicMostPickedPlayers,
        "2": [],
        "3": []
      },
      usesLiveData: false
    };
  }
}
