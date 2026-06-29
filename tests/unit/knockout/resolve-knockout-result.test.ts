import { describe, expect, it } from "vitest";
import {
  resolveKnockoutResult,
  type KnockoutCampaignTiebreaker
} from "@/domain/knockout/resolve-knockout-result";

type TiebreakerOverrides = Omit<Partial<KnockoutCampaignTiebreaker>, "groupCampaign"> & {
  groupCampaign?: Partial<KnockoutCampaignTiebreaker["groupCampaign"]>;
};

function buildTiebreaker(overrides: TiebreakerOverrides = {}): KnockoutCampaignTiebreaker {
  const { groupCampaign, ...baseOverrides } = overrides;

  return {
    participantId: "team-a",
    championshipPointsFor: 200,
    ...baseOverrides,
    groupCampaign: {
      position: 1,
      points: 7,
      wins: 2,
      pointsDifference: 30,
      pointsFor: 180,
      ...groupCampaign
    }
  };
}

describe("resolveKnockoutResult", () => {
  it("selects the higher match score without draw threshold", () => {
    const result = resolveKnockoutResult({
      homePoints: 50,
      awayPoints: 49.99,
      homeTiebreaker: buildTiebreaker({ participantId: "home" }),
      awayTiebreaker: buildTiebreaker({
        participantId: "away",
        championshipPointsFor: 300
      })
    });

    expect(result).toEqual({
      winner: "home",
      resultType: "home_win",
      decidedByRule: "score"
    });
  });

  it("uses total championship points when match score is tied", () => {
    const result = resolveKnockoutResult({
      homePoints: 60,
      awayPoints: 60,
      homeTiebreaker: buildTiebreaker({
        participantId: "home",
        championshipPointsFor: 210
      }),
      awayTiebreaker: buildTiebreaker({
        participantId: "away",
        championshipPointsFor: 220
      })
    });

    expect(result).toMatchObject({
      winner: "away",
      resultType: "away_win",
      decidedByRule: "championship_points"
    });
  });

  it("uses group-stage campaign criteria when total championship points are tied", () => {
    const result = resolveKnockoutResult({
      homePoints: 70,
      awayPoints: 70,
      homeTiebreaker: buildTiebreaker({
        participantId: "home",
        championshipPointsFor: 240,
        groupCampaign: { wins: 3, pointsDifference: 10, pointsFor: 150 }
      }),
      awayTiebreaker: buildTiebreaker({
        participantId: "away",
        championshipPointsFor: 240,
        groupCampaign: { wins: 2, pointsDifference: 40, pointsFor: 190 }
      })
    });

    expect(result).toMatchObject({
      winner: "home",
      resultType: "home_win",
      decidedByRule: "group_campaign"
    });
  });

  it("uses group position if all group-stage campaign criteria are tied", () => {
    const result = resolveKnockoutResult({
      homePoints: 80,
      awayPoints: 80,
      homeTiebreaker: buildTiebreaker({
        participantId: "home",
        championshipPointsFor: 260,
        groupCampaign: { position: 2 }
      }),
      awayTiebreaker: buildTiebreaker({
        participantId: "away",
        championshipPointsFor: 260,
        groupCampaign: { position: 1 }
      })
    });

    expect(result).toMatchObject({
      winner: "away",
      resultType: "away_win",
      decidedByRule: "group_position"
    });
  });

  it("still returns one winner with a deterministic fallback", () => {
    const result = resolveKnockoutResult({
      homePoints: 90,
      awayPoints: 90,
      homeTiebreaker: buildTiebreaker({
        participantId: "team-b",
        championshipPointsFor: 300
      }),
      awayTiebreaker: buildTiebreaker({
        participantId: "team-a",
        championshipPointsFor: 300
      })
    });

    expect(result).toMatchObject({
      winner: "away",
      resultType: "away_win",
      decidedByRule: "deterministic_fallback"
    });
  });
});
