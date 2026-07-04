import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { requireAdminSession } from "@/server/auth/guards";
import { SecondPhaseService } from "@/server/services/second-phase.service";

const secondPhaseService = new SecondPhaseService();

export async function POST() {
  try {
    await requireAdminSession();
    return jsonResponse(await secondPhaseService.generateRoundOf16());
  } catch (error) {
    return errorResponse(error);
  }
}
