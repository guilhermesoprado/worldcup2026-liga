import Link from "next/link";
import { FlagBadge } from "@/components/public/FlagBadge";
import type { PublicStanding } from "@/types/public";

type StandingsTableProps = {
  standings: PublicStanding[];
  roundNumber?: number;
};

export function StandingsTable({ standings, roundNumber }: StandingsTableProps) {
  return (
    <div className="standings-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="standings-table__sticky standings-table__sticky--pos">Pos</th>
            <th className="standings-table__sticky standings-table__sticky--team">Time</th>
            <th>P</th>
            <th>J</th>
            <th>V</th>
            <th>E</th>
            <th>D</th>
            <th className="standings-table__sp">SP</th>
            <th>PT</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => (
            <tr
              key={standing.participantId}
              className={
                standing.statusLabel === "qualified"
                  ? "standings-row--qualified"
                  : standing.statusLabel === "in_contention"
                    ? "standings-row--contention"
                    : standing.statusLabel === "eliminated"
                      ? "standings-row--eliminated"
                      : undefined
              }
            >
              <td className="standings-table__sticky standings-table__sticky--pos">{standing.position}</td>
              <td className="standings-table__sticky standings-table__sticky--team">
                <Link
                  href={
                    roundNumber
                      ? `/times/${standing.participantId}?round=${roundNumber}`
                      : `/times/${standing.participantId}`
                  }
                  className="team-cell"
                >
                  <FlagBadge country={standing.country} />
                  <span className="team-cell__copy">
                    <strong>{standing.cartolaTeamName}</strong>
                    <span className="muted">{standing.country}</span>
                  </span>
                </Link>
              </td>
              <td>{standing.points}</td>
              <td>{standing.matchesPlayed}</td>
              <td>{standing.wins}</td>
              <td>{standing.draws}</td>
              <td>{standing.losses}</td>
              <td className="standings-table__sp">{standing.pointsDifference.toFixed(2)}</td>
              <td>{standing.pointsFor.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="standings-legend">
        <span>
          <i className="standings-legend__dot standings-legend__dot--qualified" />
          1º e 2º classificados
        </span>
        <span>
          <i className="standings-legend__dot standings-legend__dot--contention" />
          3º na disputa
        </span>
        <span>
          <i className="standings-legend__dot standings-legend__dot--eliminated" />
          eliminado
        </span>
      </div>
    </div>
  );
}
