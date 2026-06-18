import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { PublicOverviewService } from "@/server/services/public-overview.service";

const overviewService = new PublicOverviewService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return jsonResponse(
      await overviewService.getOverview(
        searchParams.get("roundId"),
        searchParams.get("group")
      )
    );
  } catch (error) {
    return errorResponse(error);
  }
}
