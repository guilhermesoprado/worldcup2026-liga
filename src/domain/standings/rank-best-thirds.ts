import type { GroupStanding } from "@/domain/standings/calculate-group-standings";

export function rankBestThirds(thirdPlacedStandings: GroupStanding[]) {
  return [...thirdPlacedStandings].sort((a, b) => {
    return (
      b.points - a.points ||
      b.wins - a.wins ||
      b.pointsDifference - a.pointsDifference ||
      b.pointsFor - a.pointsFor
    );
  });
}

