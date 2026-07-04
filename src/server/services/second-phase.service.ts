import { buildRoundOf16Matches, buildRoundOf32Matches } from "@/domain/knockout/fill-bracket";
import { HttpError } from "@/lib/utils/http";
import { GroupRepository } from "@/server/repositories/group.repository";
import { MatchRepository } from "@/server/repositories/match.repository";
import { RoundRepository } from "@/server/repositories/round.repository";
import { StandingsSnapshotRepository } from "@/server/repositories/standings-snapshot.repository";

const ROUND_OF_32_PHASE = "round_of_32";
const ROUND_OF_32_EXTERNAL_ROUND_ID = 4;
const ROUND_OF_16_PHASE = "round_of_16";
const ROUND_OF_16_EXTERNAL_ROUND_ID = 5;

export class SecondPhaseService {
  private readonly groupRepository = new GroupRepository();
  private readonly matchRepository = new MatchRepository();
  private readonly roundRepository = new RoundRepository();
  private readonly standingsRepository = new StandingsSnapshotRepository();

  async getStatus() {
    return {
      generatedMatches: await this.matchRepository.countByPhase(ROUND_OF_32_PHASE),
      roundOf16GeneratedMatches: await this.matchRepository.countByPhase(ROUND_OF_16_PHASE)
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

  async generateRoundOf16() {
    const logs: string[] = ["Iniciando geracao das oitavas de final."];

    try {
      logs.push("Carregando rodadas e confrontos persistidos.");
      const [rounds, matches] = await Promise.all([
        this.roundRepository.listAll(),
        this.matchRepository.listAll()
      ]);
      const roundOf32Matches = matches.filter((match) => match.phase === ROUND_OF_32_PHASE);

      logs.push(`Encontrados ${roundOf32Matches.length} confrontos da segunda fase.`);

      if (roundOf32Matches.length !== 16) {
        logs.push("Falha: a segunda fase precisa ter exatamente 16 confrontos persistidos.");
        throw new HttpError(409, "A segunda fase precisa ter 16 confrontos persistidos.", {
          logs
        });
      }

      const nonOfficialMatches = roundOf32Matches.filter((match) => match.state !== "official");
      const matchesWithoutWinner = roundOf32Matches.filter(
        (match) => match.result_type !== "home_win" && match.result_type !== "away_win"
      );

      logs.push(`${roundOf32Matches.length - nonOfficialMatches.length} confrontos estao oficializados.`);

      if (nonOfficialMatches.length > 0) {
        logs.push(
          `Falha: ${nonOfficialMatches.length} confronto(s) ainda nao estao oficializados: ${nonOfficialMatches
            .map((match) => match.phase_slot)
            .join(", ")}.`
        );
        throw new HttpError(
          409,
          "Todos os confrontos da segunda fase precisam estar oficializados antes de gerar as oitavas.",
          { logs }
        );
      }

      logs.push(`${roundOf32Matches.length - matchesWithoutWinner.length} confrontos possuem vencedor definido.`);

      if (matchesWithoutWinner.length > 0) {
        logs.push(
          `Falha: ${matchesWithoutWinner.length} confronto(s) ainda nao possuem vencedor: ${matchesWithoutWinner
            .map((match) => match.phase_slot)
            .join(", ")}.`
        );
        throw new HttpError(
          409,
          "Todos os confrontos da segunda fase precisam ter vencedor de mata-mata definido.",
          { logs }
        );
      }

      const matchesByRoundId = new Map(rounds.map((round) => [round.id, round]));
      logs.push("Montando confrontos das oitavas a partir dos vencedores da segunda fase.");
      const generatedMatches = buildRoundOf16Matches(
        roundOf32Matches.map((match) => ({
          phaseSlot: match.phase_slot,
          state: match.state,
          resultType: match.result_type,
          homeParticipantId: match.home_participant_id,
          awayParticipantId: match.away_participant_id
        }))
      );

      logs.push(`Chaveamento montado com ${generatedMatches.length} confrontos de oitavas.`);
      logs.push("Carregando ou criando registro da rodada 5.");
      const generatedRound =
        (await this.roundRepository.getByExternalRoundId(ROUND_OF_16_EXTERNAL_ROUND_ID)) ??
        (await this.roundRepository.upsert({
          externalRoundId: ROUND_OF_16_EXTERNAL_ROUND_ID,
          name: "Oitavas de final",
          status: "scheduled",
          marketStatus: null
        }));

      logs.push("Substituindo confrontos atuais de oitavas no banco.");
      const insertedMatches = await this.matchRepository.replacePhaseMatches(
        ROUND_OF_16_PHASE,
        generatedMatches.map((match) => ({
          phase: ROUND_OF_16_PHASE,
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
      const sourceRoundName =
        matchesByRoundId.get(roundOf32Matches[0]?.round_id ?? "")?.name ?? "Segunda fase";

      logs.push(`Sucesso: ${insertedMatches.length} confrontos de oitavas foram persistidos.`);

      return {
        roundId: generatedRound.id,
        roundName: generatedRound.name,
        sourceRoundName,
        generatedMatches: insertedMatches.length,
        logs
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : "Falha desconhecida.";
      logs.push(`Falha inesperada: ${message}`);
      throw new HttpError(500, `Falha ao gerar oitavas de final: ${message}`, { logs });
    }
  }
}
