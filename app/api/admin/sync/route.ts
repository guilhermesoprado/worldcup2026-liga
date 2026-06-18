import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { requireAdminSession } from "@/server/auth/guards";
import { SyncService } from "@/server/services/sync.service";

const syncService = new SyncService();

export async function POST() {
  try {
    await requireAdminSession();
    return jsonResponse(await syncService.runManualSync());
  } catch (error) {
    return errorResponse(error);
  }
}

