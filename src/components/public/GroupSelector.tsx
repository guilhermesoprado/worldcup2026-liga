"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

type GroupSelectorProps = {
  groups: { code: string }[];
  activeGroupCode: string;
  selectedRoundNumber?: number;
  basePath?: string;
  pathMode?: "query" | "segment";
};

export function GroupSelector({
  groups,
  activeGroupCode,
  selectedRoundNumber,
  basePath = "/",
  pathMode = "query"
}: GroupSelectorProps) {
  const router = useRouter();

  return (
    <div className="group-selector">
      {groups.map((group) => {
        const href =
          pathMode === "segment"
            ? `${basePath}/${group.code}${selectedRoundNumber ? `?round=${selectedRoundNumber}` : ""}`
            : (() => {
                const params = new URLSearchParams();

                params.set("group", group.code);

                if (selectedRoundNumber) {
                  params.set("round", String(selectedRoundNumber));
                }

                return `${basePath}?${params.toString()}`;
              })();

        return (
          <button
            key={group.code}
            type="button"
            className={`group-pill ${activeGroupCode === group.code ? "group-pill--active" : ""}`}
            aria-current={activeGroupCode === group.code ? "page" : undefined}
            onClick={() =>
              startTransition(() => {
                router.replace(href, { scroll: false });
              })
            }
          >
            {group.code}
          </button>
        );
      })}
    </div>
  );
}
