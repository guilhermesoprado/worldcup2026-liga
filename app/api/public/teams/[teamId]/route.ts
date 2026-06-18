import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { TeamDetailService } from "@/server/services/team-detail.service";

const teamDetailService = new TeamDetailService();

export async function GET(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params;
    const { searchParams } = new URL(request.url);
    return jsonResponse(
      await teamDetailService.getTeamDetail(teamId, searchParams.get("roundId"))
    );
  } catch (error) {
    return errorResponse(error);
  }
}
