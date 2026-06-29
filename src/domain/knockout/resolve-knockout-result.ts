type KnockoutSide = "home" | "away";

export type KnockoutCampaignTiebreaker = {
  participantId: string;
  championshipPointsFor: number;
  groupCampaign: {
    position: number;
    points: number;
    wins: number;
    pointsDifference: number;
    pointsFor: number;
  };
};

export type KnockoutResultDecision =
  | "score"
  | "championship_points"
  | "group_campaign"
  | "group_position"
  | "deterministic_fallback";

export type KnockoutResult = {
  winner: KnockoutSide;
  resultType: "home_win" | "away_win";
  decidedByRule: KnockoutResultDecision;
};

export function resolveKnockoutResult({
  homePoints,
  awayPoints,
  homeTiebreaker,
  awayTiebreaker
}: {
  homePoints: number;
  awayPoints: number;
  homeTiebreaker: KnockoutCampaignTiebreaker;
  awayTiebreaker: KnockoutCampaignTiebreaker;
}): KnockoutResult {
  if (homePoints !== awayPoints) {
    return buildResult(homePoints > awayPoints ? "home" : "away", "score");
  }

  const championshipPointsComparison =
    homeTiebreaker.championshipPointsFor - awayTiebreaker.championshipPointsFor;

  if (championshipPointsComparison !== 0) {
    return buildResult(
      championshipPointsComparison > 0 ? "home" : "away",
      "championship_points"
    );
  }

  const groupCampaignComparison = compareGroupCampaign(
    homeTiebreaker.groupCampaign,
    awayTiebreaker.groupCampaign
  );

  if (groupCampaignComparison !== 0) {
    return buildResult(groupCampaignComparison > 0 ? "home" : "away", "group_campaign");
  }

  const groupPositionComparison =
    awayTiebreaker.groupCampaign.position - homeTiebreaker.groupCampaign.position;

  if (groupPositionComparison !== 0) {
    return buildResult(groupPositionComparison > 0 ? "home" : "away", "group_position");
  }

  return buildResult(
    homeTiebreaker.participantId.localeCompare(awayTiebreaker.participantId) <= 0
      ? "home"
      : "away",
    "deterministic_fallback"
  );
}

function compareGroupCampaign(
  home: KnockoutCampaignTiebreaker["groupCampaign"],
  away: KnockoutCampaignTiebreaker["groupCampaign"]
) {
  return (
    home.points - away.points ||
    home.wins - away.wins ||
    home.pointsDifference - away.pointsDifference ||
    home.pointsFor - away.pointsFor
  );
}

function buildResult(winner: KnockoutSide, decidedByRule: KnockoutResultDecision) {
  return {
    winner,
    resultType: winner === "home" ? "home_win" : "away_win",
    decidedByRule
  } satisfies KnockoutResult;
}
