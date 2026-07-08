import Link from "next/link";
import { EmptyState } from "@/components/public/EmptyState";
import { FlagBadge } from "@/components/public/FlagBadge";
import { PublicReadinessService } from "@/server/services/public-readiness.service";
import type { PublicStanding } from "@/types/public";

export const dynamic = "force-dynamic";

const publicReadinessService = new PublicReadinessService();

type ViewMode = "qualified" | "eliminated" | "thirds";

type StandingWithGroup = PublicStanding & {
  groupCode: string;
  groupPosition: number;
  qualificationTag: "direct" | "third" | "out";
};

function compareStandings(left: PublicStanding, right: PublicStanding) {
  return (
    right.points - left.points ||
    right.wins - left.wins ||
    right.pointsDifference - left.pointsDifference ||
    right.pointsFor - left.pointsFor ||
    left.cartolaTeamName.localeCompare(right.cartolaTeamName)
  );
}

function buildProjection(standingsByGroup: Record<string, PublicStanding[]>) {
  const grouped = Object.entries(standingsByGroup)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupCode, standings]) => {
      const ordered = [...standings]
        .sort(compareStandings)
        .map((standing, index) => ({
          ...standing,
          groupCode,
          groupPosition: index + 1
        }));

      return {
        groupCode,
        direct: ordered.slice(0, 2).map((standing) => ({
          ...standing,
          qualificationTag: "direct" as const
        })),
        third: ordered[2]
          ? ({
              ...ordered[2],
              qualificationTag: "third" as const
            })
          : null,
        out: ordered.slice(3).map((standing) => ({
          ...standing,
          qualificationTag: "out" as const
        }))
      };
    });

  const bestThirds = grouped
    .flatMap((group) => (group.third ? [group.third] : []))
    .sort(compareStandings)
    .slice(0, 8)
    .map((standing, index) => ({
      ...standing,
      thirdRank: index + 1
    }));

  const bestThirdKeys = new Set(bestThirds.map((standing) => standing.participantId));

  const groupedProjection = grouped.map((group) => {
    const qualifiedThird =
      group.third && bestThirdKeys.has(group.third.participantId)
        ? [group.third]
        : [];
    const eliminatedThird =
      group.third && !bestThirdKeys.has(group.third.participantId)
        ? [{ ...group.third, qualificationTag: "out" as const }]
        : [];

    return {
      groupCode: group.groupCode,
      qualified: [...group.direct, ...qualifiedThird].sort(
        (left, right) => left.groupPosition - right.groupPosition
      ),
      eliminated: [...eliminatedThird, ...group.out].sort(
        (left, right) => left.groupPosition - right.groupPosition
      )
    };
  });

  return {
    groups: groupedProjection,
    bestThirds
  };
}

function modeFromSearchParam(value: string | undefined): ViewMode {
  if (value === "eliminated" || value === "thirds") {
    return value;
  }

  return "qualified";
}

function renderBadge(tag: StandingWithGroup["qualificationTag"]) {
  if (tag === "direct") {
    return <span className="overall-team-badge overall-team-badge--direct">Classificado</span>;
  }

  if (tag === "third") {
    return <span className="overall-team-badge overall-team-badge--third">Melhor 3º</span>;
  }

  return <span className="overall-team-badge overall-team-badge--out">Fora</span>;
}

function GroupTeamRow({
  standing,
  roundNumber
}: {
  standing: StandingWithGroup;
  roundNumber: number;
}) {
  return (
    <div
      className={[
        "overall-team-row",
        standing.qualificationTag === "direct"
          ? "overall-team-row--direct"
          : standing.qualificationTag === "third"
            ? "overall-team-row--third"
            : "overall-team-row--out"
      ].join(" ")}
    >
      <div className="overall-team-rank">{standing.groupPosition}º</div>
      <Link
        href={`/times/${standing.participantId}?round=${roundNumber}`}
        className="overall-team-link"
      >
        <FlagBadge country={standing.country} />
        <span className="overall-team-copy">
          <strong>{standing.cartolaTeamName}</strong>
          <span>{standing.country} • {standing.owner}</span>
        </span>
      </Link>
      {renderBadge(standing.qualificationTag)}
    </div>
  );
}

export default async function OverallClassificationPage({
  searchParams
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const viewMode = modeFromSearchParam(resolvedSearchParams?.view);
  const snapshot = await publicReadinessService.ensurePublicDataReady();
  const projection = buildProjection(snapshot.standingsByGroup);

  const qualifiedCount = projection.groups.reduce((acc, group) => acc + group.qualified.length, 0);
  const eliminatedCount = projection.groups.reduce((acc, group) => acc + group.eliminated.length, 0);

  return (
    <main className="shell public-home overall-classification">
      <section className="hero overall-classification__hero">
        <div className="hero__glow" aria-hidden="true" />
        <div className="hero__content">
          <div className="overall-classification__hero-top">
            <div>
              <h1>Classificação geral</h1>
            </div>
            <Link href="/fase-de-grupos" className="text-link overall-classification__hero-back">
              voltar ao painel
            </Link>
          </div>
          <div className="hero__meta">
            <div className="progress">
              <div className="progress__label-row">
                <span>Progresso da fase</span>
                <strong>
                  {snapshot.completedMatches}/{snapshot.totalMatches} jogos
                </strong>
              </div>
              <div className="progress__track">
                <div
                  className="progress__bar"
                  style={{
                    width: `${snapshot.totalMatches === 0 ? 0 : Math.round((snapshot.completedMatches / snapshot.totalMatches) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card overall-classification__panel">
        <div className="overall-classification__meta">
          <span className="overall-pill">24 classificados diretos</span>
          <span className="overall-pill">8 melhores terceiros</span>
          <span className="overall-pill">16 desclassificados</span>
        </div>

        <div className="overall-classification__toolbar">
          <div className="overall-segmented" role="tablist" aria-label="Visualização da classificação">
            <Link
              href="/classificacao-geral?view=qualified"
              className={viewMode === "qualified" ? "is-active" : undefined}
              aria-current={viewMode === "qualified" ? "page" : undefined}
            >
              Classificados
            </Link>
            <Link
              href="/classificacao-geral?view=eliminated"
              className={viewMode === "eliminated" ? "is-active" : undefined}
              aria-current={viewMode === "eliminated" ? "page" : undefined}
            >
              Desclassificados
            </Link>
            <Link
              href="/classificacao-geral?view=thirds"
              className={viewMode === "thirds" ? "is-active" : undefined}
              aria-current={viewMode === "thirds" ? "page" : undefined}
            >
              Melhores terceiros
            </Link>
          </div>
        </div>

        {projection.groups.length === 0 ? (
          <EmptyState
            title="Sem classificação disponível"
            description="A classificação geral aparece quando houver confrontos processados."
          />
        ) : null}

        {projection.groups.length > 0 && viewMode === "qualified" ? (
          <>
            <div className="overall-group-list">
              {projection.groups.map((group) => (
                <section
                  key={`qualified-${group.groupCode}`}
                  className="overall-group-card overall-group-card--qualified"
                >
                  <div className="overall-group-card__title">
                    <strong>Grupo {group.groupCode}</strong>
                    <span>{group.qualified.length} classificados</span>
                  </div>
                  <div className="overall-team-stack">
                    {group.qualified.map((standing) => (
                      <GroupTeamRow
                        key={standing.participantId}
                        standing={standing}
                        roundNumber={snapshot.standingsRoundNumber}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="overall-classification__legend">
              <span>
                <i className="overall-classification__legend-dot overall-classification__legend-dot--direct" />
                classificados diretos
              </span>
              <span>
                <i className="overall-classification__legend-dot overall-classification__legend-dot--playoff" />
                terceiros que avançam
              </span>
            </div>
          </>
        ) : null}

        {projection.groups.length > 0 && viewMode === "eliminated" ? (
          <>
            <div className="overall-group-list">
              {projection.groups.map((group) => (
                <section
                  key={`eliminated-${group.groupCode}`}
                  className="overall-group-card overall-group-card--eliminated"
                >
                  <div className="overall-group-card__title">
                    <strong>Grupo {group.groupCode}</strong>
                    <span>{group.eliminated.length} fora</span>
                  </div>
                  <div className="overall-team-stack">
                    {group.eliminated.length > 0 ? (
                      group.eliminated.map((standing) => (
                        <GroupTeamRow
                          key={standing.participantId}
                          standing={standing}
                          roundNumber={snapshot.standingsRoundNumber}
                        />
                      ))
                    ) : (
                      <div className="overall-empty-row">
                        Todos os representantes do grupo avançam nesta projeção.
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>

            <div className="overall-classification__legend">
              <span>
                <i className="overall-classification__legend-dot overall-classification__legend-dot--eliminated" />
                fora da zona de classificação
              </span>
            </div>
          </>
        ) : null}

        {projection.groups.length > 0 && viewMode === "thirds" ? (
          <>
            <div className="overall-thirds-card">
              <div className="overall-thirds-head">
                <div>Ordem</div>
                <div>Time</div>
                <div>P</div>
                <div>V</div>
                <div>SP</div>
                <div>PT</div>
              </div>

              <div className="overall-team-stack">
                {projection.bestThirds.map((standing) => (
                  <div
                    key={`third-${standing.participantId}`}
                    className="overall-team-row overall-team-row--third overall-team-row--third-table"
                  >
                    <div className="overall-team-rank">{standing.thirdRank}º</div>
                    <div className="overall-team-copy">
                      <strong>{standing.cartolaTeamName}</strong>
                      <span>
                        Grupo {standing.groupCode} • {standing.country} • {standing.groupPosition}º no grupo
                      </span>
                    </div>
                    <div className="overall-stat">
                      <span>P</span>
                      {standing.points}
                    </div>
                    <div className="overall-stat">
                      <span>V</span>
                      {standing.wins}
                    </div>
                    <div className="overall-stat">
                      <span>SP</span>
                      {standing.pointsDifference.toFixed(2)}
                    </div>
                    <div className="overall-stat">
                      <span>PT</span>
                      {standing.pointsFor.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overall-classification__legend">
              <span>
                <i className="overall-classification__legend-dot overall-classification__legend-dot--playoff" />
                terceiros classificados pelo corte geral
              </span>
            </div>
          </>
        ) : null}

        <div className="overall-classification__footer-note">
          <span>{qualifiedCount} classificados</span>
          <span>{eliminatedCount} desclassificados</span>
          <span>{snapshot.standingsRoundLabel.replace(/(\d+)a rodada/, "$1ª rodada")}</span>
        </div>
      </section>
    </main>
  );
}
