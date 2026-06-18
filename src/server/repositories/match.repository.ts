import { BaseRepository } from "@/server/repositories/base.repository";

type ReplaceMatchInput = {
  phase: string;
  phaseSlot: string;
  groupId: string | null;
  roundId: string;
  homeParticipantId: string;
  awayParticipantId: string;
  homePoints: number | null;
  awayPoints: number | null;
  resultType: string | null;
  state: string;
  decidedByRule: string;
};

export class MatchRepository extends BaseRepository {
  async listByRoundId(roundId: string) {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("matches")
      .select("*")
      .eq("round_id", roundId)
      .order("phase_slot", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async countAll() {
    const db = this.ensureDb();
    const { count, error } = await db
      .from("matches")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  }

  async listAll() {
    const db = this.ensureDb();
    const { data, error } = await db.from("matches").select("*");
    if (error) throw error;
    return data ?? [];
  }

  async replaceRoundMatches(roundId: string, matches: ReplaceMatchInput[]) {
    const db = this.ensureDb();

    const { error: deleteError } = await db.from("matches").delete().eq("round_id", roundId);
    if (deleteError) throw deleteError;

    if (matches.length === 0) {
      return [];
    }

    const { data, error } = await db
      .from("matches")
      .insert(
        matches.map((match) => ({
          phase: match.phase,
          phase_slot: match.phaseSlot,
          group_id: match.groupId,
          round_id: match.roundId,
          home_participant_id: match.homeParticipantId,
          away_participant_id: match.awayParticipantId,
          home_points: match.homePoints,
          away_points: match.awayPoints,
          result_type: match.resultType,
          state: match.state,
          decided_by_rule: match.decidedByRule
        }))
      )
      .select("*");

    if (error) throw error;
    return data ?? [];
  }
}
