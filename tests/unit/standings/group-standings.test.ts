import { describe, expect, it } from "vitest";
import { calculateGroupStandings } from "@/domain/standings/calculate-group-standings";

describe("calculateGroupStandings", () => {
  it("treats matches within the draw threshold as draws", () => {
    const standings = calculateGroupStandings([
      {
        homeParticipantId: "a",
        awayParticipantId: "b",
        homePoints: 50,
        awayPoints: 45.01
      }
    ]);

    expect(standings[0]?.points).toBe(1);
    expect(standings[1]?.points).toBe(1);
  });

  it("ranks teams by points, wins, point difference, then points for", () => {
    const standings = calculateGroupStandings([
      { homeParticipantId: "a", awayParticipantId: "b", homePoints: 80, awayPoints: 70 },
      { homeParticipantId: "c", awayParticipantId: "d", homePoints: 55, awayPoints: 60 },
      { homeParticipantId: "a", awayParticipantId: "c", homePoints: 44, awayPoints: 40 },
      { homeParticipantId: "b", awayParticipantId: "d", homePoints: 77, awayPoints: 60 }
    ]);

    expect(standings.map((item) => item.participantId)).toEqual(["a", "b", "c", "d"]);
  });
});
