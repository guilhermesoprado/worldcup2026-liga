import { describe, expect, it } from "vitest";
import { roundOf32Matrix } from "@/domain/knockout/bracket-matrix";
import {
  buildRoundOf16Matches,
  buildRoundOf32Matches,
  type KnockoutStanding
} from "@/domain/knockout/fill-bracket";

const groupCodes = "ABCDEFGHIJKL".split("");

function buildStandings(thirdGroups: string[] = ["A", "C", "E", "F", "H", "I", "J", "L"]) {
  return groupCodes.flatMap((groupCode) => {
    const thirdQualified = thirdGroups.includes(groupCode);

    return [1, 2, 3, 4].map((position) => ({
      participantId: `${groupCode}${position}`,
      groupCode,
      position,
      points: position === 3 && thirdQualified ? 6 : 5 - position,
      wins: position === 3 && thirdQualified ? 2 : Math.max(0, 4 - position),
      pointsDifference: position === 3 && thirdQualified ? 10 : 4 - position,
      pointsFor: position === 3 && thirdQualified ? 100 : 90 - position
    }));
  }) satisfies KnockoutStanding[];
}

describe("buildRoundOf32Matches", () => {
  it("fills known first and second placed slots from final group positions", () => {
    const matches = buildRoundOf32Matches(buildStandings(), () => 0);

    expect(matches[0]).toMatchObject({
      phaseSlot: "R32-73",
      homeParticipantId: "A2",
      awayParticipantId: "B2"
    });
    expect(matches[2]).toMatchObject({
      phaseSlot: "R32-75",
      homeParticipantId: "F1",
      awayParticipantId: "C2"
    });
  });

  it("assigns best thirds only to compatible third-place slots", () => {
    const matches = buildRoundOf32Matches(buildStandings(), () => 0);
    const byPhaseSlot = new Map(matches.map((match) => [match.phaseSlot, match]));

    for (const slot of roundOf32Matrix) {
      if (typeof slot.awaySeed === "string") {
        continue;
      }

      const match = byPhaseSlot.get(slot.phaseSlot);
      const assignedGroup = match?.awaySeedLabel.slice(0, 1);

      expect(slot.awaySeed.eligibleGroups).toContain(assignedGroup);
    }
  });
});

describe("buildRoundOf16Matches", () => {
  const officialRoundOf32 = Array.from({ length: 16 }, (_, index) => {
    const gameNumber = 73 + index;

    return {
      phaseSlot: `R32-${gameNumber}`,
      state: "official",
      resultType: gameNumber % 2 === 0 ? "away_win" : "home_win",
      homeParticipantId: `home-${gameNumber}`,
      awayParticipantId: `away-${gameNumber}`
    };
  });

  it("crosses round-of-32 winners according to the World Cup round-of-16 bracket", () => {
    const matches = buildRoundOf16Matches(officialRoundOf32);

    expect(matches[0]).toMatchObject({
      phaseSlot: "R16-89",
      homeParticipantId: "away-74",
      awayParticipantId: "home-77",
      homeSourceSlot: "R32-74",
      awaySourceSlot: "R32-77"
    });
    expect(matches[1]).toMatchObject({
      phaseSlot: "R16-90",
      homeParticipantId: "home-73",
      awayParticipantId: "home-75"
    });
    expect(matches[7]).toMatchObject({
      phaseSlot: "R16-96",
      homeParticipantId: "home-85",
      awayParticipantId: "home-87"
    });
  });

  it("does not build round-of-16 matches from non-official source matches", () => {
    expect(() =>
      buildRoundOf16Matches([
        {
          ...officialRoundOf32[0]!,
          state: "partial"
        }
      ])
    ).toThrow("oficializados");
  });
});
