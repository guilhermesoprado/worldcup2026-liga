export type DirectSeed =
  | "A1"
  | "A2"
  | "B1"
  | "B2"
  | "C1"
  | "C2"
  | "D1"
  | "D2"
  | "E1"
  | "E2"
  | "F1"
  | "F2"
  | "G1"
  | "G2"
  | "H1"
  | "H2"
  | "I1"
  | "I2"
  | "J1"
  | "J2"
  | "K1"
  | "K2"
  | "L1"
  | "L2";

export type ThirdSeedSlot = {
  label: "third";
  eligibleGroups: readonly string[];
};

export type BracketSeed = DirectSeed | ThirdSeedSlot;

export type RoundOf32Slot = {
  phaseSlot: string;
  gameNumber: number;
  homeSeed: BracketSeed;
  awaySeed: BracketSeed;
};

export const roundOf32Matrix: RoundOf32Slot[] = [
  { phaseSlot: "R32-73", gameNumber: 73, homeSeed: "A2", awaySeed: "B2" },
  {
    phaseSlot: "R32-74",
    gameNumber: 74,
    homeSeed: "E1",
    awaySeed: { label: "third", eligibleGroups: ["A", "B", "C", "D", "F"] }
  },
  { phaseSlot: "R32-75", gameNumber: 75, homeSeed: "F1", awaySeed: "C2" },
  { phaseSlot: "R32-76", gameNumber: 76, homeSeed: "C1", awaySeed: "F2" },
  {
    phaseSlot: "R32-77",
    gameNumber: 77,
    homeSeed: "I1",
    awaySeed: { label: "third", eligibleGroups: ["C", "D", "F", "G", "H"] }
  },
  { phaseSlot: "R32-78", gameNumber: 78, homeSeed: "E2", awaySeed: "I2" },
  {
    phaseSlot: "R32-79",
    gameNumber: 79,
    homeSeed: "A1",
    awaySeed: { label: "third", eligibleGroups: ["C", "E", "F", "H", "I"] }
  },
  {
    phaseSlot: "R32-80",
    gameNumber: 80,
    homeSeed: "L1",
    awaySeed: { label: "third", eligibleGroups: ["E", "H", "I", "J", "K"] }
  },
  {
    phaseSlot: "R32-81",
    gameNumber: 81,
    homeSeed: "D1",
    awaySeed: { label: "third", eligibleGroups: ["B", "E", "F", "I", "J"] }
  },
  {
    phaseSlot: "R32-82",
    gameNumber: 82,
    homeSeed: "G1",
    awaySeed: { label: "third", eligibleGroups: ["A", "E", "H", "I", "J"] }
  },
  { phaseSlot: "R32-83", gameNumber: 83, homeSeed: "K2", awaySeed: "L2" },
  { phaseSlot: "R32-84", gameNumber: 84, homeSeed: "H1", awaySeed: "J2" },
  {
    phaseSlot: "R32-85",
    gameNumber: 85,
    homeSeed: "B1",
    awaySeed: { label: "third", eligibleGroups: ["E", "F", "G", "I", "J"] }
  },
  { phaseSlot: "R32-86", gameNumber: 86, homeSeed: "J1", awaySeed: "H2" },
  {
    phaseSlot: "R32-87",
    gameNumber: 87,
    homeSeed: "K1",
    awaySeed: { label: "third", eligibleGroups: ["D", "E", "I", "J", "L"] }
  },
  { phaseSlot: "R32-88", gameNumber: 88, homeSeed: "D2", awaySeed: "G2" }
];

export const bracketMatrix = roundOf32Matrix;
