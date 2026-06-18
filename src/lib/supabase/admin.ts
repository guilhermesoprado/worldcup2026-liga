import { createClient } from "@supabase/supabase-js";
import { getOptionalSupabaseEnv } from "@/types/env";

export function createSupabaseAdminClient() {
  const env = getOptionalSupabaseEnv();

  if (!env) {
    return null;
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
