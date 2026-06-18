"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

type RoundSelectorProps = {
  activeRoundNumber: number;
  rounds: number[];
  activeGroupCode?: string;
  basePath?: string;
};

export function RoundSelector({
  activeRoundNumber,
  rounds,
  activeGroupCode,
  basePath = "/"
}: RoundSelectorProps) {
  const router = useRouter();

  return (
    <div className="round-selector">
      {rounds.map((roundNumber) => {
        const params = new URLSearchParams();

        params.set("round", String(roundNumber));

        if (activeGroupCode) {
          params.set("group", activeGroupCode);
        }

        const href = `${basePath}?${params.toString()}`;

        return (
          <button
            key={roundNumber}
            type="button"
            className={
              roundNumber === activeRoundNumber
                ? "round-pill round-pill--active"
                : "round-pill"
            }
            aria-current={roundNumber === activeRoundNumber ? "page" : undefined}
            onClick={() =>
              startTransition(() => {
                router.replace(href, { scroll: false });
              })
            }
          >
            {roundNumber}ª rodada
          </button>
        );
      })}
    </div>
  );
}
