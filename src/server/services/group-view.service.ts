import { groups, getGroupMatches, getGroupStandings } from "@/domain/participants/static-league-data";
import { LivePublicDataService } from "@/server/services/live-public-data.service";

export class GroupViewService {
  private readonly livePublicDataService = new LivePublicDataService();

  async getGroup(groupId: string, roundId?: string | null) {
    const liveSnapshot = await this.livePublicDataService.getSnapshot();
    const normalizedGroupCode = groupId.toUpperCase();
    const group = groups.find((item) => item.code === normalizedGroupCode);
    const selectedRoundNumber = this.resolveRoundNumber(
      roundId,
      liveSnapshot.availableRounds,
      liveSnapshot.currentRoundNumber
    );

    return {
      groupId: normalizedGroupCode,
      group: group ?? null,
      selectedRoundNumber,
      standingsRoundNumber: liveSnapshot.standingsRoundNumber,
      standingsRoundLabel: liveSnapshot.standingsRoundLabel,
      standings: liveSnapshot.standingsByGroup[normalizedGroupCode] ?? getGroupStandings(normalizedGroupCode),
      matches:
        liveSnapshot.matches.filter(
          (match) =>
            match.groupCode === normalizedGroupCode &&
            match.roundNumber === selectedRoundNumber
        ) ?? getGroupMatches(normalizedGroupCode),
      groups: liveSnapshot.groups,
      availableRounds: liveSnapshot.availableRounds,
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
