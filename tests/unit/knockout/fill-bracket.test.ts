import { describe, expect, it } from "vitest";
import { roundOf32Matrix } from "@/domain/knockout/bracket-matrix";
import { buildRoundOf32Matches, type KnockoutStanding } from "@/domain/knockout/fill-bracket";

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
