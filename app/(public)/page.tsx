import RoundOf16Page from "./oitavas-de-final/page";
import QuarterFinalsPage from "./quartas-de-final/page";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export const dynamic = "force-dynamic";

const publicReadinessService = new PublicReadinessService();
const QUARTER_FINALS_EXTERNAL_ROUND_ID = 6;

export default async function HomePage() {
  const snapshot = await publicReadinessService.ensurePublicDataReady();
  const quarterFinalsAvailable =
    snapshot.availableRounds.includes(QUARTER_FINALS_EXTERNAL_ROUND_ID) &&
    snapshot.matches.some((match) => match.phase === "quarter_finals");

  return quarterFinalsAvailable ? <QuarterFinalsPage /> : <RoundOf16Page />;
}
