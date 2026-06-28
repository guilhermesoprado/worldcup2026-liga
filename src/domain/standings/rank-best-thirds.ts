import type { GroupStanding } from "@/domain/standings/calculate-group-standings";

type BestThirdStanding = Pick<GroupStanding, "points" | "wins" | "pointsDifference" | "pointsFor">;

export function rankBestThirds<T extends BestThirdStanding>(thirdPlacedStandings: T[]) {
  return [...thirdPlacedStandings].sort((a, b) => {
    return (
      b.points - a.points ||
      b.wins - a.wins ||
      b.pointsDifference - a.pointsDifference ||
      b.pointsFor - a.pointsFor
    );
  });
}
