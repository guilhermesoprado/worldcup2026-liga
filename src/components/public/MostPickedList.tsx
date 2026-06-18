import type { PublicMostPickedPlayer } from "@/types/public";

type MostPickedListProps = {
  players: PublicMostPickedPlayer[];
};

const TOTAL_LEAGUE_TEAMS = 48;

export function MostPickedList({ players }: MostPickedListProps) {
  return (
    <div className="most-picked-list">
      {players.map((player) => {
        const percentage = (player.pickCount / TOTAL_LEAGUE_TEAMS) * 100;

        return (
          <div key={player.athleteId} className="most-picked-item">
            <span className="most-picked-item__rank">{player.rankPosition}</span>
            <div className="most-picked-item__copy">
              <strong>{player.playerName}</strong>
              <div className="muted">
                {player.clubName} · {player.positionName}
              </div>
              <div className="most-picked-item__bar">
                <span style={{ width: `${percentage}%` }} />
              </div>
            </div>
            <div className="most-picked-item__stats">
              <strong>{percentage.toFixed(1)}%</strong>
              <span className="muted">{player.pickCount} times da liga</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
