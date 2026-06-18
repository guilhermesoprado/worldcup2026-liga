import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { MatchesViewService } from "@/server/services/matches-view.service";

const matchesViewService = new MatchesViewService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return jsonResponse(await matchesViewService.getMatches(searchParams.get("phase"), searchParams.get("roundId")));
  } catch (error) {
    return errorResponse(error);
  }
}

