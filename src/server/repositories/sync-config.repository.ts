import { BaseRepository } from "@/server/repositories/base.repository";

type UpdateSyncConfigInput = {
  isEnabled?: boolean;
  intervalMinutes?: number;
  lastChangedBy?: string;
};

export class SyncConfigRepository extends BaseRepository {
  async getCurrentConfig() {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("sync_configurations")
      .select("*")
      .order("last_changed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (data) {
      return data;
    }

    const { data: created, error: createError } = await db
      .from("sync_configurations")
      .insert({
        is_enabled: true,
        interval_minutes: 15,
        auto_sync_mode: "access_driven"
      })
      .select("*")
      .single();

    if (createError) throw createError;
    return created;
  }

  async updateCurrentConfig(input: UpdateSyncConfigInput) {
    const db = this.ensureDb();
    const current = await this.getCurrentConfig();

    const { data, error } = await db
      .from("sync_configurations")
      .update({
        is_enabled: input.isEnabled ?? current.is_enabled,
        interval_minutes: input.intervalMinutes ?? current.interval_minutes,
        last_changed_by: input.lastChangedBy ?? current.last_changed_by,
        last_changed_at: new Date().toISOString()
      })
      .eq("id", current.id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }
}
