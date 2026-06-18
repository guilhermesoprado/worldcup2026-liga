import { BaseRepository } from "@/server/repositories/base.repository";

export type RoundStatus = "scheduled" | "live" | "official" | "sync_failed";

type UpsertRoundInput = {
  externalRoundId: number;
  name: string;
  status: RoundStatus;
  marketStatus: string | null;
  startedAt?: string | null;
  officializedAt?: string | null;
  lastSyncedAt?: string | null;
  sourceVersion?: string | null;
};

export class RoundRepository extends BaseRepository {
  async getById(id: string) {
    const db = this.ensureDb();
    const { data, error } = await db.from("rounds").select("*").eq("id", id).maybeSingle();

    if (error) throw error;
    return data;
  }

  async listAll() {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("rounds")
      .select("*")
      .order("external_round_id", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async getByExternalRoundId(externalRoundId: number) {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("rounds")
      .select("*")
      .eq("external_round_id", externalRoundId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async upsert(input: UpsertRoundInput) {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("rounds")
      .upsert(
        {
          external_round_id: input.externalRoundId,
          name: input.name,
          status: input.status,
          market_status: input.marketStatus,
          started_at: input.startedAt ?? null,
          officialized_at: input.officializedAt ?? null,
          last_synced_at: input.lastSyncedAt ?? null,
          source_version: input.sourceVersion ?? null
        },
        { onConflict: "external_round_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }
}
