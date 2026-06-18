import { BaseRepository } from "@/server/repositories/base.repository";

export class GroupRepository extends BaseRepository {
  async listAll() {
    const db = this.ensureDb();
    const { data, error } = await db
      .from("groups")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }
}
