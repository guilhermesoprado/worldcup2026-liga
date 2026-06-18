import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { GroupViewService } from "@/server/services/group-view.service";

const groupViewService = new GroupViewService();

export async function GET(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await context.params;
    const { searchParams } = new URL(request.url);
    return jsonResponse(
      await groupViewService.getGroup(groupId, searchParams.get("roundId"))
    );
  } catch (error) {
    return errorResponse(error);
  }
}
