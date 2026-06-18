import {
  clearAdminSession,
  createAdminSession,
  validateAdminCredentials
} from "@/server/auth/session";
import { errorResponse, HttpError, jsonResponse } from "@/lib/utils/http";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password || !validateAdminCredentials(body.email, body.password)) {
      throw new HttpError(401, "Invalid credentials");
    }

    await createAdminSession(body.email);

    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    await clearAdminSession();
    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
