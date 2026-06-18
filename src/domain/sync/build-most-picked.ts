type LineupAthlete = {
  athleteId: number;
  playerName: string;
  clubName?: string | null;
  positionName?: string | null;
};

export function buildMostPicked(lineups: LineupAthlete[][]) {
  const counts = new Map<number, { athleteId: number; playerName: string; clubName?: string | null; positionName?: string | null; pickCount: number }>();

  for (const lineup of lineups) {
    for (const athlete of lineup) {
      const current = counts.get(athlete.athleteId);
      if (current) {
        current.pickCount += 1;
      } else {
        counts.set(athlete.athleteId, { ...athlete, pickCount: 1 });
      }
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.pickCount - a.pickCount || a.playerName.localeCompare(b.playerName))
    .map((athlete, index) => ({ ...athlete, rankPosition: index + 1 }));
}

