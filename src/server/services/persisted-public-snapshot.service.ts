import {
  groups as staticGroups,
  participants as staticParticipants,
  publicMostPickedPlayers,
  publicMatches,
  publicStandingsByGroup
} from "@/domain/participants/static-league-data";
import { GroupRepository } from "@/server/repositories/group.repository";
import { MatchRepository } from "@/server/repositories/match.repository";
import { MostPickedRepository } from "@/server/repositories/most-picked.repository";
import { ParticipantRepository } from "@/server/repositories/participant.repository";
import { RoundRepository } from "@/server/repositories/round.repository";
import { StandingsSnapshotRepository } from "@/server/repositories/standings-snapshot.repository";
import type {
  PublicMatch,
  PublicMostPickedPlayer,
  PublicStanding
} from "@/types/public";

type PersistedSnapshot = {
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

const GROUP_STAGE_TOTAL_MATCHES = 72;

export class PersistedPublicSnapshotService {
  private readonly roundRepository = new RoundRepository();
  private readonly groupRepository = new GroupRepository();
  private readonly participantRepository = new ParticipantRepository();
  private readonly matchRepository = new MatchRepository();
  private readonly standingsRepository = new StandingsSnapshotRepository();
  private readonly mostPickedRepository = new MostPickedRepository();

  async getSnapshot(): Promise<PersistedSnapshot | null> {
    try {
      const [rounds, groups, participants, matches, standings, mostPicked] = await Promise.all([
        this.roundRepository.listAll(),
        this.groupRepository.listAll(),
        this.participantRepository.listAll(),
        this.matchRepository.listAll(),
        this.standingsRepository.listAll(),
        this.mostPickedRepository.listAll()
      ]);

      if (rounds.length === 0 || matches.length === 0 || standings.length === 0) {
        return null;
      }

      const groupCodeById = new Map(groups.map((group) => [group.id, group.code]));
      const staticByCartolaTeamId = new Map(
        staticParticipants.map((participant) => [participant.cartolaTeamId, participant])
      );
      const participantByDbId = new Map(
        participants.map((participant) => {
          const mapped = staticByCartolaTeamId.get(participant.cartola_team_id);
          return [participant.id, { db: participant, mapped }];
        })
      );
      const availableRounds = rounds
        .map((round) => round.external_round_id)
        .sort((left, right) => left - right);

      const currentRound = this.resolveCurrentRound(rounds);
      const liveRound = rounds.find((round) => round.status === "live") ?? null;
      const standingsRound = liveRound
        ? liveRound
        : [...rounds]
            .filter((round) => round.status === "official")
            .sort((left, right) => right.external_round_id - left.external_round_id)[0] ?? currentRound;

      const dedupedMatches = new Map<string, (typeof matches)[number]>();

      for (const match of matches) {
        const key = `${match.round_id}:${match.phase_slot}`;
        const current = dedupedMatches.get(key);

        if (!current) {
          dedupedMatches.set(key, match);
          continue;
        }

        if (this.compareStatePriority(match.state, current.state) >= 0) {
          dedupedMatches.set(key, match);
        }
      }

      const publicMatches: PublicMatch[] = [...dedupedMatches.values()].flatMap((match) => {
        const home = participantByDbId.get(match.home_participant_id)?.mapped;
        const away = participantByDbId.get(match.away_participant_id)?.mapped;

        if (!home || !away) {
          return [];
        }

        const round = rounds.find((item) => item.id === match.round_id);

        if (!round) {
          return [];
        }

        return [
          {
            id: match.id,
            phase: match.phase,
            phaseSlot: match.phase_slot,
            groupCode: match.group_id ? groupCodeById.get(match.group_id) ?? home.groupCode : null,
            roundNumber: round.external_round_id,
            state: match.state,
            homeParticipantId: home.id,
            awayParticipantId: away.id,
            homeCountry: home.country,
            awayCountry: away.country,
            homeOwner: home.owner,
            awayOwner: away.owner,
            homeCartolaTeamName: home.cartolaTeamName,
            awayCartolaTeamName: away.cartolaTeamName,
            homePoints:
              typeof match.home_points === "number" ? Number(match.home_points) : null,
            awayPoints:
              typeof match.away_points === "number" ? Number(match.away_points) : null,
            kickoffLabel: `${round.external_round_id}a rodada`
          }
        ];
      });

      const dedupedStandings = new Map<string, (typeof standings)[number]>();

      for (const snapshot of standings) {
        const key = `${snapshot.round_id}:${snapshot.group_id ?? "no-group"}:${snapshot.participant_id}`;
        const current = dedupedStandings.get(key);

        if (!current) {
          dedupedStandings.set(key, snapshot);
          continue;
        }

        if (this.compareStatePriority(snapshot.state, current.state) >= 0) {
          dedupedStandings.set(key, snapshot);
        }
      }

      const standingsByGroup = [...dedupedStandings.values()].reduce<Record<string, PublicStanding[]>>(
        (acc, snapshot) => {
          const participant = participantByDbId.get(snapshot.participant_id)?.mapped;
          const round = rounds.find((item) => item.id === snapshot.round_id);
          const groupCode = snapshot.group_id
            ? groupCodeById.get(snapshot.group_id)
            : participant?.groupCode;

          if (!participant || !round || !groupCode) {
            return acc;
          }

          if (round.external_round_id !== standingsRound.external_round_id) {
            return acc;
          }

          if (!acc[groupCode]) {
            acc[groupCode] = [];
          }

          acc[groupCode]!.push({
            participantId: participant.id,
            country: participant.country,
            owner: participant.owner,
            cartolaTeamName: participant.cartolaTeamName,
            points: snapshot.points,
            matchesPlayed: snapshot.wins + snapshot.draws + snapshot.losses,
            wins: snapshot.wins,
            draws: snapshot.draws,
            losses: snapshot.losses,
            pointsFor: Number(snapshot.points_for),
            pointsAgainst: Number(snapshot.points_against),
            pointsDifference: Number(snapshot.points_difference),
            position: snapshot.position,
            statusLabel: snapshot.status_label
          });

          return acc;
        },
        {}
      );

      Object.values(standingsByGroup).forEach((groupStandings) =>
        groupStandings.sort((left, right) => left.position - right.position)
      );

      const mostPickedByRound = mostPicked.reduce<Record<string, PublicMostPickedPlayer[]>>(
        (acc, player) => {
          const round = rounds.find((item) => item.id === player.round_id);

          if (!round) {
            return acc;
          }

          const roundKey = String(round.external_round_id);

          if (!acc[roundKey]) {
            acc[roundKey] = [];
          }

          acc[roundKey]!.push({
            athleteId: player.athlete_id,
            playerName: player.player_name,
            clubName: player.club_name ?? "Sem clube",
            positionName: player.position_name ?? "Sem posicao",
            pickCount: player.pick_count,
            rankPosition: player.rank_position
          });

          return acc;
        },
        {}
      );

      Object.values(mostPickedByRound).forEach((players) =>
        players.sort((left, right) => left.rankPosition - right.rankPosition)
      );

      return {
        phase: "groups",
        phaseLabel: "Fase de grupos",
        completedMatches: publicMatches.filter((match) => match.state !== "scheduled").length,
        totalMatches: GROUP_STAGE_TOTAL_MATCHES,
        currentRoundNumber: currentRound.external_round_id,
        currentRoundLabel: `${currentRound.external_round_id}a rodada`,
        standingsRoundNumber: standingsRound.external_round_id,
        standingsRoundLabel: `${standingsRound.external_round_id}a rodada`,
        stateLabel: this.buildStateLabel(currentRound, standingsRound),
        groups: staticGroups.map((group) => ({
          code: group.code,
          displayName: group.displayName
        })),
        availableRounds,
        standingsByGroup,
        matches: publicMatches,
        mostPickedByRound,
        usesLiveData: false
      };
    } catch {
      return null;
    }
  }

  async getSnapshotOrFallback(): Promise<PersistedSnapshot> {
    const persistedSnapshot = await this.getSnapshot();

    if (persistedSnapshot) {
      return persistedSnapshot;
    }

    return this.buildFallbackSnapshot();
  }

  private resolveCurrentRound(rounds: Array<{ external_round_id: number; status: string }>) {
    const liveRound = rounds.find((round) => round.status === "live");

    if (liveRound) {
      return liveRound;
    }

    const highestOfficialRound = [...rounds]
      .filter((round) => round.status === "official")
      .sort((left, right) => right.external_round_id - left.external_round_id)[0];

    if (highestOfficialRound) {
      return highestOfficialRound;
    }

    return [...rounds].sort((left, right) => left.external_round_id - right.external_round_id)[0]!;
  }

  private buildStateLabel(
    currentRound: { external_round_id: number; status: string },
    standingsRound: { external_round_id: number }
  ) {
    if (currentRound.status === "live") {
      return `Parcial da ${currentRound.external_round_id}a rodada`;
    }

    if (standingsRound.external_round_id === 0) {
      return "Aguardando dados oficiais";
    }

    return `Oficial da ${standingsRound.external_round_id}a rodada`;
  }

  private compareStatePriority(left: string, right: string) {
    const priority: Record<string, number> = {
      scheduled: 0,
      partial: 1,
      live: 1,
      official: 2
    };

    return (priority[left] ?? -1) - (priority[right] ?? -1);
  }

  private buildFallbackSnapshot(): PersistedSnapshot {
    return {
      phase: "groups",
      phaseLabel: "Fase de grupos",
      completedMatches: 24,
      totalMatches: GROUP_STAGE_TOTAL_MATCHES,
      currentRoundNumber: 1,
      currentRoundLabel: "1a rodada",
      standingsRoundNumber: 1,
      standingsRoundLabel: "1a rodada",
      stateLabel: "Aguardando sincronizacao",
      groups: staticGroups.map((group) => ({
        code: group.code,
        displayName: group.displayName
      })),
      availableRounds: [1, 2, 3],
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
