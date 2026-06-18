import { BaseRepository } from "@/server/repositories/base.repository";

type ReplaceMostPickedInput = {
  roundId: string;
  athleteId: number;
  playerName: string;
  clubName: string | null;
  positionName: string | null;
  pickCount: number;
  rankPosition: number;
  state: string;
};

export class MostPickedRepository extends BaseRepository {
  async listByRoundId(roundId: string) {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("most_picked_players")
      .select("*")
      .eq("round_id", roundId)
      .order("rank_position", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async countAll() {
    const db = this.ensureDb();
    const { count, error } = await db
      .from("most_picked_players")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  }

  async listAll() {
    const db = this.ensureDb();
    const { data, error } = await db.from("most_picked_players").select("*");
    if (error) throw error;
    return data ?? [];
  }

  async replaceRoundSnapshots(roundId: string, players: ReplaceMostPickedInput[]) {
    const db = this.ensureDb();

    const { error: deleteError } = await db
      .from("most_picked_players")
      .delete()
      .eq("round_id", roundId);

    if (deleteError) throw deleteError;

    if (players.length === 0) {
      return [];
    }

    const { data, error } = await db
      .from("most_picked_players")
      .insert(
        players.map((player) => ({
          round_id: player.roundId,
          athlete_id: player.athleteId,
          player_name: player.playerName,
          club_name: player.clubName,
          position_name: player.positionName,
          pick_count: player.pickCount,
          rank_position: player.rankPosition,
          state: player.state
        }))
      )
      .select("*");

    if (error) throw error;
    return data ?? [];
  }
}
