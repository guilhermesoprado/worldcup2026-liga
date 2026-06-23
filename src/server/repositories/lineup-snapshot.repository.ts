import { BaseRepository } from "@/server/repositories/base.repository";

type ReplaceLineupPlayerInput = {
  athleteId: number;
  playerName: string;
  photoUrl: string | null;
  clubName: string | null;
  positionName: string | null;
  captainMultiplier: number;
  points: number;
  statusLabel: string;
  source: "starter" | "reserve";
  entered: boolean;
  counted: boolean;
};

type ReplaceLineupSnapshotInput = {
  participantId: string;
  roundId: string;
  captainId: number | null;
  reserveLuxuryId: number | null;
  captainName: string | null;
  coachName: string | null;
  formationLabel: string | null;
  totalPoints: number;
  state: string;
  rawPayloadRef: string | null;
  players: ReplaceLineupPlayerInput[];
};

export class LineupSnapshotRepository extends BaseRepository {
  async getByRoundAndParticipant(roundId: string, participantId: string) {
    const db = this.ensureDb();
    const { data: snapshot, error: snapshotError } = await db
      .from("lineup_snapshots")
      .select("*")
      .eq("round_id", roundId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (snapshotError) throw snapshotError;

    if (!snapshot) {
      return null;
    }

    const { data: players, error: playersError } = await db
      .from("lineup_players")
      .select("*")
      .eq("lineup_snapshot_id", snapshot.id);

    if (playersError) throw playersError;

    return {
      snapshot,
      players: players ?? []
    };
  }

  async listByRoundId(roundId: string) {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("lineup_snapshots")
      .select("*")
      .eq("round_id", roundId)
      .order("total_points", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async getCounts() {
    const db = this.ensureDb();

    const [{ count: snapshotsCount, error: snapshotsError }, { count: playersCount, error: playersError }] =
      await Promise.all([
        db.from("lineup_snapshots").select("*", { count: "exact", head: true }),
        db.from("lineup_players").select("*", { count: "exact", head: true })
      ]);

    if (snapshotsError) throw snapshotsError;
    if (playersError) throw playersError;

    return {
      snapshots: snapshotsCount ?? 0,
      players: playersCount ?? 0
    };
  }

  async replaceRoundSnapshots(roundId: string, snapshots: ReplaceLineupSnapshotInput[]) {
    const db = this.ensureDb();

    const { data: existing, error: existingError } = await db
      .from("lineup_snapshots")
      .select("id")
      .eq("round_id", roundId);

    if (existingError) throw existingError;

    const existingIds = (existing ?? []).map((item) => item.id);

    if (existingIds.length > 0) {
      const { error: deletePlayersError } = await db
        .from("lineup_players")
        .delete()
        .in("lineup_snapshot_id", existingIds);

      if (deletePlayersError) throw deletePlayersError;
    }

    const { error: deleteSnapshotsError } = await db
      .from("lineup_snapshots")
      .delete()
      .eq("round_id", roundId);

    if (deleteSnapshotsError) throw deleteSnapshotsError;

    if (snapshots.length === 0) {
      return [];
    }

    const { data: insertedSnapshots, error: insertSnapshotsError } = await db
      .from("lineup_snapshots")
      .insert(
        snapshots.map((snapshot) => ({
          participant_id: snapshot.participantId,
          round_id: snapshot.roundId,
          captain_id: snapshot.captainId,
          reserve_luxury_id: snapshot.reserveLuxuryId,
          captain_name: snapshot.captainName,
          coach_name: snapshot.coachName,
          formation_label: snapshot.formationLabel,
          total_points: snapshot.totalPoints,
          state: snapshot.state,
          raw_payload_ref: snapshot.rawPayloadRef
        }))
      )
      .select("*");

    if (insertSnapshotsError) throw insertSnapshotsError;

    const snapshotsByParticipantId = new Map(
      (insertedSnapshots ?? []).map((snapshot) => [snapshot.participant_id, snapshot.id])
    );

    const players = snapshots.flatMap((snapshot) => {
      const lineupSnapshotId = snapshotsByParticipantId.get(snapshot.participantId);

      if (!lineupSnapshotId) {
        return [];
      }

      return snapshot.players.map((player) => ({
        lineup_snapshot_id: lineupSnapshotId,
        athlete_id: player.athleteId,
        player_name: player.playerName,
        photo_url: player.photoUrl,
        club_name: player.clubName,
        position_name: player.positionName,
        captain_multiplier: player.captainMultiplier,
        points: player.points,
        status_label: player.statusLabel,
        source: player.source,
        entered: player.entered,
        counted: player.counted
      }));
    });

    if (players.length > 0) {
      const { error: insertPlayersError } = await db.from("lineup_players").insert(players);

      if (insertPlayersError) {
        const message = JSON.stringify(insertPlayersError).toLowerCase();
        const missingPhotoColumn =
          message.includes("photo_url") &&
          (message.includes("column") || message.includes("schema cache") || message.includes("does not exist"));

        if (!missingPhotoColumn) {
          throw insertPlayersError;
        }

        const fallbackPlayers = players.map(({ photo_url: _photoUrl, ...player }) => player);
        const { error: fallbackInsertPlayersError } = await db
          .from("lineup_players")
          .insert(fallbackPlayers);

        if (fallbackInsertPlayersError) {
          throw fallbackInsertPlayersError;
        }
      }
    }

    return insertedSnapshots ?? [];
  }
}
