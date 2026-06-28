import { buildRoundOf32Matches } from "@/domain/knockout/fill-bracket";
import { HttpError } from "@/lib/utils/http";
import { GroupRepository } from "@/server/repositories/group.repository";
import { MatchRepository } from "@/server/repositories/match.repository";
import { RoundRepository } from "@/server/repositories/round.repository";
import { StandingsSnapshotRepository } from "@/server/repositories/standings-snapshot.repository";

const ROUND_OF_32_PHASE = "round_of_32";
const ROUND_OF_32_EXTERNAL_ROUND_ID = 4;

export class SecondPhaseService {
  private readonly groupRepository = new GroupRepository();
  private readonly matchRepository = new MatchRepository();
  private readonly roundRepository = new RoundRepository();
  private readonly standingsRepository = new StandingsSnapshotRepository();

  async getStatus() {
    return {
      generatedMatches: await this.matchRepository.countByPhase(ROUND_OF_32_PHASE)
    };
  }

  async generateRoundOf32() {
    const [groups, rounds, standings] = await Promise.all([
      this.groupRepository.listAll(),
      this.roundRepository.listAll(),
      this.standingsRepository.listAll()
    ]);
    const finalRound = [...rounds]
      .filter((round) => round.status === "official")
      .sort((left, right) => right.external_round_id - left.external_round_id)[0];

    if (!finalRound) {
      throw new HttpError(409, "Nenhuma rodada oficializada encontrada para gerar a segunda fase.");
    }

    const groupCodeById = new Map(groups.map((group) => [group.id, group.code]));
    const finalStandings = standings
      .filter((standing) => standing.round_id === finalRound.id && standing.phase === "groups")
      .map((standing) => {
        const groupCode = standing.group_id ? groupCodeById.get(standing.group_id) : null;

        if (!groupCode) {
          return null;
        }

        return {
          participantId: standing.participant_id,
          groupCode,
          position: standing.position,
          points: standing.points,
          wins: standing.wins,
          pointsDifference: Number(standing.points_difference),
          pointsFor: Number(standing.points_for)
        };
      })
      .filter((standing): standing is NonNullable<typeof standing> => Boolean(standing));

    const generatedRound =
      (await this.roundRepository.getByExternalRoundId(ROUND_OF_32_EXTERNAL_ROUND_ID)) ??
      (await this.roundRepository.upsert({
        externalRoundId: ROUND_OF_32_EXTERNAL_ROUND_ID,
        name: "Segunda fase",
        status: "scheduled",
        marketStatus: null
      }));
    const matches = buildRoundOf32Matches(finalStandings);
    const insertedMatches = await this.matchRepository.replacePhaseMatches(
      ROUND_OF_32_PHASE,
      matches.map((match) => ({
        phase: ROUND_OF_32_PHASE,
        phaseSlot: match.phaseSlot,
        groupId: null,
        roundId: generatedRound.id,
        homeParticipantId: match.homeParticipantId,
        awayParticipantId: match.awayParticipantId,
        homePoints: null,
        awayPoints: null,
        resultType: null,
        state: "scheduled",
        decidedByRule: "score"
      }))
    );

    return {
      roundId: generatedRound.id,
      roundName: generatedRound.name,
      sourceRoundName: finalRound.name,
      generatedMatches: insertedMatches.length
    };
  }
}
