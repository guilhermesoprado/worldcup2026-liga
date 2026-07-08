import { publicMatches } from "@/domain/participants/static-league-data";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export class MatchesViewService {
  private readonly publicReadinessService = new PublicReadinessService();

  async getMatches(phase?: string | null, roundId?: string | null) {
    const liveSnapshot = await this.publicReadinessService.ensurePublicDataReady();
    const baseMatches = liveSnapshot.matches.length > 0 ? liveSnapshot.matches : publicMatches;
    const phaseAvailableRounds =
      phase === "groups"
        ? liveSnapshot.availableRounds.filter((round) => round <= 3)
        : liveSnapshot.availableRounds;
    const defaultRoundNumber =
      phase === "groups" ? Math.min(liveSnapshot.currentRoundNumber, 3) : liveSnapshot.currentRoundNumber;
    const selectedRoundNumber = this.resolveRoundNumber(
      roundId,
      phaseAvailableRounds,
      defaultRoundNumber
    );
    const filteredMatches = baseMatches.filter((match) => {
      const phaseMatches = !phase || match.phase === phase;
      const roundMatches = match.roundNumber === selectedRoundNumber;
      return phaseMatches && roundMatches;
    });
    const orderedMatches = [...filteredMatches].sort((left, right) => {
      const leftGroup = left.groupCode ?? "ZZZ";
      const rightGroup = right.groupCode ?? "ZZZ";

      return leftGroup.localeCompare(rightGroup) || left.id.localeCompare(right.id);
    });

    return {
      phase: phase ?? "groups",
      roundId: String(selectedRoundNumber),
      currentRoundNumber: liveSnapshot.currentRoundNumber,
      availableRounds: phaseAvailableRounds,
      matches: orderedMatches,
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
