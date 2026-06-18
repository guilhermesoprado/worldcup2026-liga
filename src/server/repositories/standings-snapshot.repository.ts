import { BaseRepository } from "@/server/repositories/base.repository";

type ReplaceStandingInput = {
  scope: string;
  phase: string;
  groupId: string | null;
  participantId: string;
  roundId: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  position: number;
  statusLabel: string;
  state: string;
};

export class StandingsSnapshotRepository extends BaseRepository {
  async listByRoundId(roundId: string) {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("standings_snapshots")
      .select("*")
      .eq("round_id", roundId)
      .order("group_id", { ascending: true })
      .order("position", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async countAll() {
    const db = this.ensureDb();
    const { count, error } = await db
      .from("standings_snapshots")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  }

  async listAll() {
    const db = this.ensureDb();
    const { data, error } = await db.from("standings_snapshots").select("*");
    if (error) throw error;
    return data ?? [];
  }

  async replaceRoundSnapshots(roundId: string, snapshots: ReplaceStandingInput[]) {
    const db = this.ensureDb();

    const { error: deleteError } = await db
      .from("standings_snapshots")
      .delete()
      .eq("round_id", roundId);
    if (deleteError) throw deleteError;

    if (snapshots.length === 0) {
      return [];
    }

    const { data, error } = await db
      .from("standings_snapshots")
      .insert(
        snapshots.map((snapshot) => ({
          scope: snapshot.scope,
          phase: snapshot.phase,
          group_id: snapshot.groupId,
          participant_id: snapshot.participantId,
          round_id: snapshot.roundId,
          points: snapshot.points,
          wins: snapshot.wins,
          draws: snapshot.draws,
          losses: snapshot.losses,
          points_for: snapshot.pointsFor,
          points_against: snapshot.pointsAgainst,
          points_difference: snapshot.pointsDifference,
          position: snapshot.position,
          status_label: snapshot.statusLabel,
          state: snapshot.state
        }))
      )
      .select("*");

    if (error) throw error;
    return data ?? [];
  }
}
