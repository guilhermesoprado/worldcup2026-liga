import { BaseRepository } from "@/server/repositories/base.repository";

type CreateSyncExecutionInput = {
  triggerType: "automatic_access" | "manual_admin";
  status: "success" | "partial_success" | "failed" | "skipped";
  summaryMessage: string;
  startedAt?: string;
  finishedAt?: string;
  affectedRoundId?: string | null;
  requestFingerprint?: string | null;
};

export class SyncExecutionRepository extends BaseRepository {
  async getById(id: string) {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("sync_executions")
      .select("*, rounds:affected_round_id(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async listRecent(limit = 10) {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("sync_executions")
      .select("*, rounds:affected_round_id(*)")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }

  async getLatest() {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("sync_executions")
      .select("*, rounds:affected_round_id(*)")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(input: CreateSyncExecutionInput) {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("sync_executions")
      .insert({
        trigger_type: input.triggerType,
        status: input.status,
        summary_message: input.summaryMessage,
        started_at: input.startedAt ?? new Date().toISOString(),
        finished_at: input.finishedAt ?? new Date().toISOString(),
        affected_round_id: input.affectedRoundId ?? null,
        request_fingerprint: input.requestFingerprint ?? null
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }
}
