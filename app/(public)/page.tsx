import FinalPage from "./final/page";
import SemiFinalPage from "./semi-final/page";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export const dynamic = "force-dynamic";

const publicReadinessService = new PublicReadinessService();
const FINAL_EXTERNAL_ROUND_ID = 8;

export default async function HomePage() {
  const snapshot = await publicReadinessService.ensurePublicDataReady();
  const finalRoundStarted =
    snapshot.availableRounds.includes(FINAL_EXTERNAL_ROUND_ID) &&
    snapshot.matches.some(
      (match) =>
        match.phase === "final" || match.phase === "third_place"
    );

  return finalRoundStarted ? <FinalPage /> : <SemiFinalPage />;
}
