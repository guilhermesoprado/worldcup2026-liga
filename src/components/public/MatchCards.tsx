import Link from "next/link";
import { FlagBadge } from "@/components/public/FlagBadge";
import type { PublicMatch } from "@/types/public";

type MatchCardsProps = {
  matches: PublicMatch[];
};

function hasScore(match: PublicMatch) {
  return match.homePoints !== null && match.awayPoints !== null;
}

function resolveWinner(match: PublicMatch) {
  if (!hasScore(match)) {
    return null;
  }

  const difference = Math.abs(match.homePoints! - match.awayPoints!);

  if (difference <= 5) {
    return null;
  }

  return match.homePoints! > match.awayPoints! ? "home" : "away";
}

export function MatchCards({ matches }: MatchCardsProps) {
  return (
    <div className="match-list">
      {matches.map((match) => {
        const scoreAvailable = hasScore(match);
        const winner = resolveWinner(match);

        return (
          <article key={match.id} className={`match-card match-card--${match.state}`}>
            <div className="match-card__top">
              <span className="badge">{match.groupCode ? `Grupo ${match.groupCode}` : match.phase}</span>
              {match.state === "partial" ? <span className="match-card__live-dot" aria-label="Ao vivo" /> : null}
            </div>

            <div className={`match-card__teams ${scoreAvailable ? "match-card__teams--with-score" : ""}`}>
              <div className={`match-team ${winner === "home" ? "match-team--winner" : ""}`}>
                <div className="match-team__header">
                  <FlagBadge country={match.homeCountry} />
                  <div className="match-team__copy">
                    <span className="match-team__name">{match.homeCartolaTeamName}</span>
                    <span className="match-team__country">{match.homeCountry}</span>
                  </div>
                </div>
                {match.state !== "scheduled" ? (
                  <Link href={`/times/${match.homeParticipantId}`} className="text-link">
                    ver time
                  </Link>
                ) : null}
              </div>

              <div className={`match-score ${scoreAvailable ? "match-score--result" : "match-score--scheduled"}`}>
                <span className="match-score__value">
                  {scoreAvailable ? match.homePoints!.toFixed(2) : "-"}
                </span>
                <span className="match-score__separator">x</span>
                <span className="match-score__value">
                  {scoreAvailable ? match.awayPoints!.toFixed(2) : "-"}
                </span>
              </div>

              <div className={`match-team match-team--right ${winner === "away" ? "match-team--winner" : ""}`}>
                <div className="match-team__header match-team__header--right">
                  <div className="match-team__copy">
                    <span className="match-team__name">{match.awayCartolaTeamName}</span>
                    <span className="match-team__country">{match.awayCountry}</span>
                  </div>
                  <FlagBadge country={match.awayCountry} />
                </div>
                {match.state !== "scheduled" ? (
                  <Link href={`/times/${match.awayParticipantId}`} className="text-link">
                    ver time
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
