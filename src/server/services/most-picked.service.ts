import { LivePublicDataService } from "@/server/services/live-public-data.service";

export class MostPickedService {
  private readonly livePublicDataService = new LivePublicDataService();

  async getMostPicked(roundId?: string | null) {
    const liveSnapshot = await this.livePublicDataService.getSnapshot();
    const selectedRoundNumber = this.resolveRoundNumber(
      roundId,
      liveSnapshot.availableRounds,
      liveSnapshot.currentRoundNumber
    );

    return {
      roundId: String(selectedRoundNumber),
      currentRoundNumber: liveSnapshot.currentRoundNumber,
      availableRounds: liveSnapshot.availableRounds,
      athletes:
        liveSnapshot.mostPickedByRound[String(selectedRoundNumber)] ??
        [],
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
