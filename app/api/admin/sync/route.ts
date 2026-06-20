import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { requireAdminSession } from "@/server/auth/guards";
import { SyncService } from "@/server/services/sync.service";

const syncService = new SyncService();

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json().catch(() => null)) as { mode?: string } | null;

    if (body?.mode === "officialized") {
      return jsonResponse(await syncService.runOfficializedRoundsSync());
    }

    return jsonResponse(await syncService.runManualSync());
  } catch (error) {
    return errorResponse(error);
  }
}
