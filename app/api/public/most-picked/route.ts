import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { MostPickedService } from "@/server/services/most-picked.service";

const mostPickedService = new MostPickedService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return jsonResponse(await mostPickedService.getMostPicked(searchParams.get("roundId")));
  } catch (error) {
    return errorResponse(error);
  }
}
