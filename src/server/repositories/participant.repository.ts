import { BaseRepository } from "@/server/repositories/base.repository";

export class ParticipantRepository extends BaseRepository {
  async listAll() {
    const db = this.ensureDb();
    const { data, error } = await db.from("participants").select("*").eq("is_active", true);
    if (error) throw error;
    return data ?? [];
  }

  async getById(id: string) {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("participants")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
