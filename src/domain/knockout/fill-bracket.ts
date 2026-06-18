import { bracketMatrix } from "@/domain/knockout/bracket-matrix";

export type QualifiedTeam = {
  seedLabel: string;
  participantId: string;
};

export function fillBracket(qualifiedTeams: QualifiedTeam[]) {
  const index = new Map(qualifiedTeams.map((team) => [team.seedLabel, team]));

  return bracketMatrix.map((slot) => ({
    phaseSlot: slot.phaseSlot,
    homeParticipantId: index.get(slot.homeSeed)?.participantId ?? null,
    awayParticipantId: index.get(slot.awaySeed)?.participantId ?? null
  }));
}

