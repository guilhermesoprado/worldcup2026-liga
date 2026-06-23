import { groups, getCompetitionOverview, getGroupMatches, getGroupStandings } from "@/domain/participants/static-league-data";
import { PublicReadinessService } from "@/server/services/public-readiness.service";

export class PublicOverviewService {
  private readonly publicReadinessService = new PublicReadinessService();

  async getOverview(roundId?: string | null, groupId?: string | null) {
    const liveSnapshot = await this.publicReadinessService.ensurePublicDataReady();
    const overview = getCompetitionOverview();
    const activeGroup = this.resolveActiveGroup(
      groupId,
      liveSnapshot.groups,
      groups[0] ?? null
    );
    const selectedRoundNumber = this.resolveRoundNumber(
      roundId,
      liveSnapshot.availableRounds,
      liveSnapshot.currentRoundNumber
    );

    return {
      phase: liveSnapshot.phase ?? overview.phaseKey,
      phaseLabel: liveSnapshot.phaseLabel ?? overview.phaseLabel,
      completedMatches: liveSnapshot.completedMatches,
      totalMatches: liveSnapshot.totalMatches,
      currentRoundNumber: liveSnapshot.currentRoundNumber,
      currentRoundLabel: liveSnapshot.currentRoundLabel,
      selectedRoundNumber,
      selectedRoundLabel: `${selectedRoundNumber}a rodada`,
      standingsRoundNumber: liveSnapshot.standingsRoundNumber,
      standingsRoundLabel: liveSnapshot.standingsRoundLabel,
      stateLabel: liveSnapshot.stateLabel,
      groups: liveSnapshot.groups,
      availableRounds: liveSnapshot.availableRounds,
      activeGroupCode: activeGroup?.code ?? groups[0]?.code ?? "A",
      activeGroupStandings:
        liveSnapshot.standingsByGroup[activeGroup?.code ?? "A"] ??
        getGroupStandings(activeGroup?.code ?? "A"),
      currentRoundMatches:
        liveSnapshot.matches.filter(
          (match) =>
            match.groupCode === (activeGroup?.code ?? "A") &&
            match.roundNumber === selectedRoundNumber
        ) ?? getGroupMatches(activeGroup?.code ?? "A"),
      mostPickedPlayers:
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

  private resolveActiveGroup(
    groupId: string | null | undefined,
    liveGroups: { code: string; displayName: string }[],
    fallbackGroup: { code: string } | null
  ) {
    const normalizedGroupCode = groupId?.toUpperCase();
    const resolvedGroup = liveGroups.find((group) => group.code === normalizedGroupCode);

    if (resolvedGroup) {
      return resolvedGroup;
    }

    return fallbackGroup ? { code: fallbackGroup.code, displayName: `Grupo ${fallbackGroup.code}` } : null;
  }
}
