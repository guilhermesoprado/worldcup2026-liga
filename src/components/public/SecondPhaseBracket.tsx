import { FlagBadge } from "@/components/public/FlagBadge";
import type { PublicMatch } from "@/types/public";

type SecondPhaseBracketProps = {
  matches: PublicMatch[];
};

export function SecondPhaseBracket({ matches }: SecondPhaseBracketProps) {
  const orderedMatches = [...matches].sort((left, right) =>
    (left.phaseSlot ?? left.id).localeCompare(right.phaseSlot ?? right.id)
  );

  return (
    <div className="second-phase-bracket">
      {orderedMatches.map((match) => (
        <article key={match.id} className="second-phase-match">
          <div className="second-phase-match__teams">
            <div className="second-phase-slot">
              <span className="second-phase-slot__team">
                <FlagBadge country={match.homeCountry} />
                <strong>{match.homeCartolaTeamName}</strong>
              </span>
              <span>{match.homeCountry}</span>
            </div>
            <span className="second-phase-match__versus">x</span>
            <div className="second-phase-slot second-phase-slot--right">
              <span className="second-phase-slot__team second-phase-slot__team--right">
                <strong>{match.awayCartolaTeamName}</strong>
                <FlagBadge country={match.awayCountry} />
              </span>
              <span>{match.awayCountry}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
