import { errorResponse, HttpError, jsonResponse } from "@/lib/utils/http";
import { requireAdminSession } from "@/server/auth/guards";
import { SyncConfigRepository } from "@/server/repositories/sync-config.repository";

const repository = new SyncConfigRepository();

export async function GET() {
  try {
    await requireAdminSession();
    return jsonResponse(await repository.getCurrentConfig());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const adminEmail = await requireAdminSession();
    const body = (await request.json()) as {
      isEnabled?: boolean;
      intervalMinutes?: number;
    };

    if (
      body.intervalMinutes !== undefined &&
      (!Number.isInteger(body.intervalMinutes) || body.intervalMinutes < 1 || body.intervalMinutes > 180)
    ) {
      throw new HttpError(400, "intervalMinutes must be an integer between 1 and 180");
    }

    return jsonResponse(
      await repository.updateCurrentConfig({
        isEnabled: body.isEnabled,
        intervalMinutes: body.intervalMinutes,
        lastChangedBy: adminEmail
      })
    );
  } catch (error) {
    return errorResponse(error);
  }
}
