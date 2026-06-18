import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/utils/http";

export abstract class BaseRepository {
  protected readonly db = createSupabaseAdminClient();

  protected ensureDb() {
    if (!this.db) {
      throw new HttpError(503, "Database is not configured");
    }

    return this.db;
  }
}
