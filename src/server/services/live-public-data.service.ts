import { buildMostPicked } from "@/domain/sync/build-most-picked";
import {
  buildAthletePartialIndex,
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
  participants,
  publicMostPickedPlayers,
  publicMatches,
  publicStandingsByGroup,
  resolveParticipantByCountry
} from "@/domain/participants/static-league-data";
import { cartolaClient } from "@/lib/cartola/client";
import { mapAthleteCatalog } from "@/lib/cartola/mappers";
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

    const liveSnapshot = await this.buildLiveSnapshot();

    if (liveSnapshot && this.isPartialSnapshot(liveSnapshot)) {
      cachedSnapshot = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        snapshot: liveSnapshot
      };

      return liveSnapshot;
    }

    const persistedSnapshot = await this.persistedPublicSnapshotService.getSnapshot();

    if (persistedSnapshot) {
      return persistedSnapshot;
    }

    if (cachedSnapshot && cachedSnapshot.expiresAt > Date.now()) {
      return cachedSnapshot.snapshot;
    }

    const snapshot = liveSnapshot ?? this.buildFallbackSnapshot();

    cachedSnapshot = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      snapshot
    };

    return snapshot;
  }

  private isPartialSnapshot(snapshot: LiveSnapshot) {
    return snapshot.matches.some((match) => match.state === "partial");
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

      const marketState = resolveMarketState(marketStatus);

      if (!marketState.shouldForceSync) {
        return null;
      }

      const athleteCatalog = market
        ? mapAthleteCatalog(market)
        : new Map<number, { name: string; clubId: number; positionId: number }>();
      const partialIndex = buildAthletePartialIndex(athletesScored);
      const roundsToBuild = GROUP_STAGE_ROUNDS.filter((roundNumber) => {
        if (marketState.partialRoundNumber !== null) {
          return roundNumber <= marketState.partialRoundNumber;
        }

        return roundNumber <= marketState.officialRoundNumber;
      });
      const lineupsByRound: Record<
        number,
        Array<{ participantId: string; lineup: NormalizedLineup }>
      > = {};

      await Promise.all(
        roundsToBuild.map(async (roundNumber) => {
          const results = await Promise.allSettled(
            participants.map((participant) =>
              cartolaClient.getTeamById(participant.cartolaTeamId, roundNumber)
            )
          );

          lineupsByRound[roundNumber] = results.flatMap((result, index) => {
            if (result.status === "rejected") {
              return [];
            }

            const normalized =
              marketState.partialRoundNumber === roundNumber
                ? buildPartialLineupSnapshot({
                    roundNumber,
                    lineup: result.value,
                    athleteCatalog,
                    market,
                    partialIndex
                  })
                : buildOfficialLineupSnapshot({
                    roundNumber,
                    lineup: result.value,
                    athleteCatalog,
                    market
                  });

            return [
              {
                participantId: participants[index]!.id,
                lineup: normalized
              }
            ];
          });
        })
      );

      const matches = roundsToBuild.flatMap((roundNumber) =>
        this.buildMatchesForRound({
          roundNumber,
          isPartial: marketState.partialRoundNumber === roundNumber,
          fixtures,
          lineups: lineupsByRound[roundNumber] ?? []
        })
      );
      const standingsByGroup = this.buildStandingsByGroup(matches, marketState.displayRoundNumber);
      const mostPickedByRound = this.buildMostPickedByRound(lineupsByRound);

      return {
        phase: "groups",
        phaseLabel: "Fase de grupos",
        completedMatches: matches.filter((match) => match.state !== "scheduled").length,
        totalMatches: GROUP_STAGE_TOTAL_MATCHES,
        currentRoundNumber: marketState.displayRoundNumber,
        currentRoundLabel: formatRoundLabel(marketState.displayRoundNumber),
        standingsRoundNumber: marketState.displayRoundNumber,
        standingsRoundLabel: formatRoundLabel(marketState.displayRoundNumber),
        stateLabel: this.buildStateLabel(marketState),
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

  private buildMatchesForRound({
    roundNumber,
    isPartial,
    fixtures,
    lineups
  }: {
    roundNumber: number;
    isPartial: boolean;
    fixtures: Awaited<ReturnType<typeof cartolaClient.getFixtures>>;
    lineups: Array<{ participantId: string; lineup: NormalizedLineup }>;
  }): PublicMatch[] {
    const baseMatches =
      isPartial && fixtures.rodada === roundNumber
        ? this.mapCurrentRoundFixtures(fixtures)
        : this.buildRoundTemplates(roundNumber);
    const pointsByParticipantId = new Map(
      lineups.map((entry) => [entry.participantId, entry.lineup.totalPoints])
    );

    return baseMatches.map((match) => ({
      ...match,
      state: isPartial ? "partial" : "official",
      homePoints: Number((pointsByParticipantId.get(match.homeParticipantId) ?? 0).toFixed(2)),
      awayPoints: Number((pointsByParticipantId.get(match.awayParticipantId) ?? 0).toFixed(2))
    }));
  }

  private buildStandingsByGroup(matches: PublicMatch[], standingsRoundNumber: number) {
    const effectiveMatches = matches.filter(
      (match) =>
        match.roundNumber <= standingsRoundNumber &&
        match.homePoints !== null &&
        match.awayPoints !== null
    );

    return groups.reduce<Record<string, PublicStanding[]>>((acc, group) => {
      const groupMatches = effectiveMatches.filter((match) => match.groupCode === group.code);
      const standingInput: GroupMatch[] = groupMatches.map((match) => ({
        homeParticipantId: match.homeParticipantId,
        awayParticipantId: match.awayParticipantId,
        homePoints: match.homePoints ?? 0,
        awayPoints: match.awayPoints ?? 0
      }));
      const computed = calculateGroupStandings(standingInput);

      acc[group.code] = computed.map((standing, index) => {
        const participant = participants.find((item) => item.id === standing.participantId)!;

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
    lineupsByRound: Record<number, Array<{ participantId: string; lineup: NormalizedLineup }>>
  ) {
    const result: Record<string, PublicMostPickedPlayer[]> = {};

    for (const roundNumber of GROUP_STAGE_ROUNDS) {
      const roundLineups = lineupsByRound[roundNumber] ?? [];

      result[String(roundNumber)] = buildMostPicked(
        roundLineups.map((entry) =>
          entry.lineup.starters.map((player) => ({
            athleteId: player.athleteId,
            playerName: player.playerName,
            clubName: player.clubName,
            positionName: player.positionName
          }))
        )
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
          kickoffLabel: formatRoundLabel(roundNumber)
        };
      })
    );
  }

  private mapCurrentRoundFixtures(fixtures: Awaited<ReturnType<typeof cartolaClient.getFixtures>>) {
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
          kickoffLabel: formatRoundLabel(fixtures.rodada)
        }
      ];
    });
  }

  private buildStateLabel(marketState: ReturnType<typeof resolveMarketState>) {
    if (marketState.partialRoundNumber !== null) {
      return `Parcial da ${formatRoundLabel(marketState.partialRoundNumber)}`;
    }

    if (marketState.officialRoundNumber > 0) {
      return `Oficial da ${formatRoundLabel(marketState.officialRoundNumber)}`;
    }

    return "Aguardando dados oficiais";
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
