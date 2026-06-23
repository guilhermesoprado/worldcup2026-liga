import { publicMatches } from "@/domain/participants/static-league-data";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export class MatchesViewService {
  private readonly publicReadinessService = new PublicReadinessService();

  async getMatches(phase?: string | null, roundId?: string | null) {
    const liveSnapshot = await this.publicReadinessService.ensurePublicDataReady();
    const baseMatches = liveSnapshot.matches.length > 0 ? liveSnapshot.matches : publicMatches;
    const selectedRoundNumber = this.resolveRoundNumber(
      roundId,
      liveSnapshot.availableRounds,
      liveSnapshot.currentRoundNumber
    );
    const filteredMatches = baseMatches.filter((match) => {
      const phaseMatches = !phase || match.phase === phase;
      const roundMatches = match.roundNumber === selectedRoundNumber;
      return phaseMatches && roundMatches;
    });

    return {
      phase: phase ?? "groups",
      roundId: String(selectedRoundNumber),
      currentRoundNumber: liveSnapshot.currentRoundNumber,
      availableRounds: liveSnapshot.availableRounds,
      matches: filteredMatches,
      usesLiveData: liveSnapshot.usesLiveData
    };
  }

  private resolveRoundNumber(
    roundId: string | null | undefined,
    availableRounds: number[],
    defaultRoundNumber: number
  ) {
    const parsedRound = Number(roundId);

    if (Number.isInteger(parsedRound) && availableRounds.includes(parsedRound)) {
      return parsedRound;
    }

    return defaultRoundNumber;
  }
}
