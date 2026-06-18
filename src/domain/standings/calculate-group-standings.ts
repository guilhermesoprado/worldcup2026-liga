export type GroupMatch = {
  homeParticipantId: string;
  awayParticipantId: string;
  homePoints: number;
  awayPoints: number;
};

export type GroupStanding = {
  participantId: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
};

const DRAW_THRESHOLD = 5;

export function calculateGroupStandings(matches: GroupMatch[]): GroupStanding[] {
  const table = new Map<string, GroupStanding>();

  for (const match of matches) {
    const home = ensureStanding(table, match.homeParticipantId);
    const away = ensureStanding(table, match.awayParticipantId);
    const diff = Math.abs(match.homePoints - match.awayPoints);
    const isDraw = diff <= DRAW_THRESHOLD;

    home.pointsFor += match.homePoints;
    home.pointsAgainst += match.awayPoints;
    away.pointsFor += match.awayPoints;
    away.pointsAgainst += match.homePoints;

    if (isDraw) {
      home.points += 1;
      away.points += 1;
      home.draws += 1;
      away.draws += 1;
    } else if (match.homePoints > match.awayPoints) {
      home.points += 3;
      home.wins += 1;
      away.losses += 1;
    } else {
      away.points += 3;
      away.wins += 1;
      home.losses += 1;
    }
  }

  return [...table.values()]
    .map((standing) => ({
      ...standing,
      pointsDifference: Number((standing.pointsFor - standing.pointsAgainst).toFixed(2))
    }))
    .sort((a, b) => {
      return (
        b.points - a.points ||
        b.wins - a.wins ||
        b.pointsDifference - a.pointsDifference ||
        b.pointsFor - a.pointsFor
      );
    });
}

function ensureStanding(table: Map<string, GroupStanding>, participantId: string) {
  const existing = table.get(participantId);
  if (existing) return existing;

  const created: GroupStanding = {
    participantId,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointsDifference: 0
  };

  table.set(participantId, created);
  return created;
}

