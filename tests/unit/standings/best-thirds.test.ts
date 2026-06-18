import { describe, expect, it } from "vitest";
import { rankBestThirds } from "@/domain/standings/rank-best-thirds";

describe("rankBestThirds", () => {
  it("orders third placed teams using the configured tie-breakers", () => {
    const ranked = rankBestThirds([
      {
        participantId: "x",
        points: 4,
        wins: 1,
        draws: 1,
        losses: 1,
        pointsFor: 120,
        pointsAgainst: 118,
        pointsDifference: 2
      },
      {
        participantId: "y",
        points: 4,
        wins: 1,
        draws: 1,
        losses: 1,
        pointsFor: 110,
        pointsAgainst: 108,
        pointsDifference: 2
      }
    ]);

    expect(ranked[0]?.participantId).toBe("x");
  });
});
