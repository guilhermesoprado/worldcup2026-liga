import {
  roundOf32Matrix,
  roundOf16Matrix,
  type BracketSeed,
  type DirectSeed,
  type ThirdSeedSlot
} from "@/domain/knockout/bracket-matrix";
import { rankBestThirds } from "@/domain/standings/rank-best-thirds";

export type QualifiedTeam = {
  seedLabel: string;
  participantId: string;
};

export type KnockoutStanding = {
  participantId: string;
  groupCode: string;
  position: number;
  points: number;
  wins: number;
  pointsDifference: number;
  pointsFor: number;
};

export type FilledRoundOf32Match = {
  phaseSlot: string;
  gameNumber: number;
  homeParticipantId: string;
  awayParticipantId: string;
  homeSeedLabel: string;
  awaySeedLabel: string;
};

export type KnockoutSourceMatch = {
  phaseSlot: string;
  state: string;
  resultType: string | null;
  homeParticipantId: string;
  awayParticipantId: string;
};

export type FilledRoundOf16Match = {
  phaseSlot: string;
  gameNumber: number;
  homeParticipantId: string;
  awayParticipantId: string;
  homeSourceSlot: string;
  awaySourceSlot: string;
};

export function fillBracket(qualifiedTeams: QualifiedTeam[]) {
  const index = new Map(qualifiedTeams.map((team) => [team.seedLabel, team]));

  return roundOf32Matrix.map((slot) => ({
    phaseSlot: slot.phaseSlot,
    homeParticipantId: typeof slot.homeSeed === "string" ? index.get(slot.homeSeed)?.participantId ?? null : null,
    awayParticipantId: typeof slot.awaySeed === "string" ? index.get(slot.awaySeed)?.participantId ?? null : null
  }));
}

export function buildRoundOf16Matches(sourceMatches: KnockoutSourceMatch[]): FilledRoundOf16Match[] {
  const winnersByGameNumber = new Map<number, { participantId: string; phaseSlot: string }>();

  for (const match of sourceMatches) {
    const gameNumber = extractGameNumber(match.phaseSlot);

    if (gameNumber === null) {
      continue;
    }

    if (match.state !== "official") {
      throw new Error("Todos os confrontos da segunda fase precisam estar oficializados.");
    }

    if (match.resultType !== "home_win" && match.resultType !== "away_win") {
      throw new Error(`Confronto ${match.phaseSlot} ainda nao possui vencedor de mata-mata.`);
    }

    winnersByGameNumber.set(gameNumber, {
      phaseSlot: match.phaseSlot,
      participantId:
        match.resultType === "home_win" ? match.homeParticipantId : match.awayParticipantId
    });
  }

  return roundOf16Matrix.map((slot) => {
    const home = winnersByGameNumber.get(slot.homeSourceGameNumber);
    const away = winnersByGameNumber.get(slot.awaySourceGameNumber);

    if (!home || !away) {
      throw new Error(
        `Nao foi possivel encontrar vencedores dos jogos ${slot.homeSourceGameNumber} e ${slot.awaySourceGameNumber}.`
      );
    }

    return {
      phaseSlot: slot.phaseSlot,
      gameNumber: slot.gameNumber,
      homeParticipantId: home.participantId,
      awayParticipantId: away.participantId,
      homeSourceSlot: home.phaseSlot,
      awaySourceSlot: away.phaseSlot
    };
  });
}

export function buildRoundOf32Matches(
  standings: KnockoutStanding[],
  random: () => number = Math.random
): FilledRoundOf32Match[] {
  const standingsByGroup = groupFinalStandings(standings);
  const directSeeds = buildDirectSeedIndex(standingsByGroup);
  const bestThirds = rankBestThirds(
    Object.entries(standingsByGroup).flatMap(([groupCode, groupStandings]) => {
      const third = groupStandings[2];

      return third ? [{ ...third, groupCode }] : [];
    })
  ).slice(0, 8);
  const thirdAssignments = assignThirdPlacedSlots(
    bestThirds.map((standing) => ({
      groupCode: standing.groupCode,
      participantId: standing.participantId
    })),
    random
  );

  return roundOf32Matrix.map((slot) => {
    const home = resolveSeed(slot.homeSeed, directSeeds, thirdAssignments);
    const away = resolveSeed(slot.awaySeed, directSeeds, thirdAssignments);

    return {
      phaseSlot: slot.phaseSlot,
      gameNumber: slot.gameNumber,
      homeParticipantId: home.participantId,
      awayParticipantId: away.participantId,
      homeSeedLabel: home.seedLabel,
      awaySeedLabel: away.seedLabel
    };
  });
}

function groupFinalStandings(standings: KnockoutStanding[]) {
  const grouped = standings.reduce<Record<string, KnockoutStanding[]>>((acc, standing) => {
    if (!acc[standing.groupCode]) {
      acc[standing.groupCode] = [];
    }

    acc[standing.groupCode]!.push(standing);
    return acc;
  }, {});

  Object.values(grouped).forEach((groupStandings) =>
    groupStandings.sort((left, right) => left.position - right.position)
  );

  const completeGroups = Object.entries(grouped).filter(([, groupStandings]) => groupStandings.length >= 4);

  if (completeGroups.length !== 12) {
    throw new Error("A classificacao final precisa ter 12 grupos completos.");
  }

  return grouped;
}

function buildDirectSeedIndex(standingsByGroup: Record<string, KnockoutStanding[]>) {
  const directSeeds = new Map<DirectSeed, KnockoutStanding>();

  for (const [groupCode, groupStandings] of Object.entries(standingsByGroup)) {
    const first = groupStandings[0];
    const second = groupStandings[1];

    if (!first || !second) {
      throw new Error(`Grupo ${groupCode} nao possui primeiro e segundo colocados.`);
    }

    directSeeds.set(`${groupCode}1` as DirectSeed, first);
    directSeeds.set(`${groupCode}2` as DirectSeed, second);
  }

  return directSeeds;
}

function resolveSeed(
  seed: BracketSeed,
  directSeeds: Map<DirectSeed, KnockoutStanding>,
  thirdAssignments: Map<string, { groupCode: string; participantId: string }>
) {
  if (typeof seed === "string") {
    const standing = directSeeds.get(seed);

    if (!standing) {
      throw new Error(`Slot ${seed} nao encontrado na classificacao final.`);
    }

    return {
      participantId: standing.participantId,
      seedLabel: seed
    };
  }

  const assignedThird = thirdAssignments.get(thirdSlotKey(seed));

  if (!assignedThird) {
    throw new Error(`Nao foi possivel preencher terceiro para ${thirdSlotKey(seed)}.`);
  }

  return {
    participantId: assignedThird.participantId,
    seedLabel: `${assignedThird.groupCode}3`
  };
}

function assignThirdPlacedSlots(
  thirdPlacedTeams: Array<{ groupCode: string; participantId: string }>,
  random: () => number
) {
  if (thirdPlacedTeams.length !== 8) {
    throw new Error("A segunda fase precisa exatamente dos 8 melhores terceiros.");
  }

  const thirdSlots = roundOf32Matrix
    .map((slot) => slot.awaySeed)
    .filter((seed): seed is ThirdSeedSlot => typeof seed !== "string");
  const assignments = assignSlotBacktracking(
    shuffle(thirdSlots, random),
    shuffle(thirdPlacedTeams, random),
    new Map()
  );

  if (!assignments) {
    throw new Error("Nao ha combinacao valida para sortear os melhores terceiros nos slots disponiveis.");
  }

  return assignments;
}

function assignSlotBacktracking(
  remainingSlots: ThirdSeedSlot[],
  remainingTeams: Array<{ groupCode: string; participantId: string }>,
  assignments: Map<string, { groupCode: string; participantId: string }>
): Map<string, { groupCode: string; participantId: string }> | null {
  if (remainingSlots.length === 0) {
    return assignments;
  }

  const [slot, ...nextSlots] = remainingSlots;
  const eligibleTeams = remainingTeams.filter((team) => slot.eligibleGroups.includes(team.groupCode));

  for (const team of eligibleTeams) {
    const nextAssignments = new Map(assignments);
    nextAssignments.set(thirdSlotKey(slot), team);

    const result = assignSlotBacktracking(
      nextSlots,
      remainingTeams.filter((remainingTeam) => remainingTeam.participantId !== team.participantId),
      nextAssignments
    );

    if (result) {
      return result;
    }
  }

  return null;
}

function thirdSlotKey(seed: ThirdSeedSlot) {
  return `3:${seed.eligibleGroups.join("")}`;
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }

  return copy;
}

function extractGameNumber(phaseSlot: string) {
  const match = phaseSlot.match(/-(\d+)$/);

  return match ? Number(match[1]) : null;
}
