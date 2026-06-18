import { notFound } from "next/navigation";
import { groups as staticGroups, participants as staticParticipants } from "@/domain/participants/static-league-data";
import { GroupRepository } from "@/server/repositories/group.repository";
import { LineupSnapshotRepository } from "@/server/repositories/lineup-snapshot.repository";
import { MatchRepository } from "@/server/repositories/match.repository";
import { MostPickedRepository } from "@/server/repositories/most-picked.repository";
import { ParticipantRepository } from "@/server/repositories/participant.repository";
import { RoundRepository } from "@/server/repositories/round.repository";
import { StandingsSnapshotRepository } from "@/server/repositories/standings-snapshot.repository";
import { SyncExecutionRepository } from "@/server/repositories/sync-execution.repository";

export class AdminHistoryService {
  private readonly syncExecutionRepository = new SyncExecutionRepository();
  private readonly roundRepository = new RoundRepository();
  private readonly participantRepository = new ParticipantRepository();
  private readonly groupRepository = new GroupRepository();
  private readonly matchRepository = new MatchRepository();
  private readonly standingsSnapshotRepository = new StandingsSnapshotRepository();
  private readonly lineupSnapshotRepository = new LineupSnapshotRepository();
  private readonly mostPickedRepository = new MostPickedRepository();

  async getExecutionDetail(executionId: string) {
    const execution = await this.syncExecutionRepository.getById(executionId);

    if (!execution) {
      notFound();
    }

    const round =
      execution.affected_round_id ? await this.roundRepository.getById(execution.affected_round_id) : null;
    const roundSummary = round ? await this.getRoundSummary(round.id) : null;

    return {
      execution,
      round,
      roundSummary
    };
  }

  async getRoundDetail(roundId: string) {
    const round = await this.roundRepository.getById(roundId);

    if (!round) {
      notFound();
    }

    const recentExecutions = (await this.syncExecutionRepository.listRecent(20)).filter(
      (execution) => execution.affected_round_id === roundId
    );
    const summary = await this.getRoundSummary(roundId);

    return {
      round,
      recentExecutions,
      ...summary
    };
  }

  private async getRoundSummary(roundId: string) {
    const [groups, participants, matches, standings, lineups, mostPicked] = await Promise.all([
      this.groupRepository.listAll(),
      this.participantRepository.listAll(),
      this.matchRepository.listByRoundId(roundId),
      this.standingsSnapshotRepository.listByRoundId(roundId),
      this.lineupSnapshotRepository.listByRoundId(roundId),
      this.mostPickedRepository.listByRoundId(roundId)
    ]);

    const groupCodeById = new Map(groups.map((group) => [group.id, group.code]));
    const staticByCartolaId = new Map(
      staticParticipants.map((participant) => [participant.cartolaTeamId, participant])
    );
    const participantByDbId = new Map(
      participants.map((participant) => [
        participant.id,
        staticByCartolaId.get(participant.cartola_team_id)
      ])
    );

    return {
      matches: matches.map((match) => ({
        id: match.id,
        phaseSlot: match.phase_slot,
        state: match.state,
        groupCode: match.group_id ? groupCodeById.get(match.group_id) ?? "-" : "-",
        home: participantByDbId.get(match.home_participant_id),
        away: participantByDbId.get(match.away_participant_id),
        homePoints: match.home_points,
        awayPoints: match.away_points,
        resultType: match.result_type
      })),
      standingsByGroup: staticGroups.map((group) => ({
        groupCode: group.code,
        entries: standings
          .filter((entry) => groupCodeById.get(entry.group_id ?? "") === group.code)
          .map((entry) => {
            const participant = participantByDbId.get(entry.participant_id);

            return {
              participant,
              position: entry.position,
              points: entry.points,
              wins: entry.wins,
              draws: entry.draws,
              losses: entry.losses,
              pointsDifference: entry.points_difference,
              pointsFor: entry.points_for,
              statusLabel: entry.status_label
            };
          })
      })).filter((group) => group.entries.length > 0),
      topLineups: lineups.slice(0, 10).map((lineup) => {
        const participant = participantByDbId.get(lineup.participant_id);

        return {
          id: lineup.id,
          participant,
          totalPoints: lineup.total_points,
          state: lineup.state
        };
      }),
      mostPicked: mostPicked.slice(0, 12).map((player) => ({
        athleteId: player.athlete_id,
        playerName: player.player_name,
        positionName: player.position_name,
        clubName: player.club_name,
        pickCount: player.pick_count,
        rankPosition: player.rank_position
      })),
      counts: {
        matches: matches.length,
        standings: standings.length,
        lineups: lineups.length,
        mostPicked: mostPicked.length
      }
    };
  }
}
