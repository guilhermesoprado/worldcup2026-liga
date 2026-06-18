import { HttpError } from "@/lib/utils/http";
import { readAdminSession } from "@/server/auth/session";
import { getEnv } from "@/types/env";

export async function requireAdminSession() {
  const session = await readAdminSession();

  if (!session) {
    throw new HttpError(401, "Admin authentication required");
  }

  if (session !== getEnv().ADMIN_EMAIL) {
    throw new HttpError(401, "Invalid admin session");
  }

  return session;
}

