import Link from "next/link";
import { EmptyState } from "@/components/public/EmptyState";
import { FlagBadge } from "@/components/public/FlagBadge";
import { PhaseHero } from "@/components/public/PhaseHero";
import { PublicReadinessService } from "@/server/services/public-readiness.service";
import type { PublicStanding } from "@/types/public";

export const dynamic = "force-dynamic";

const publicReadinessService = new PublicReadinessService();

type OverallQualifiedStanding = PublicStanding & {
  groupCode: string;
  overallPosition: number;
  qualificationBand: "direct" | "playoff" | "eliminated";
};

function rankOverallStandings(
  standingsByGroup: Record<string, PublicStanding[]>
): OverallQualifiedStanding[] {
  const ranked = Object.entries(standingsByGroup)
    .flatMap(([groupCode, standings]) =>
      standings.map((standing) => ({
        ...standing,
        groupCode
      }))
    )
    .sort((left, right) => {
      return (
        right.points - left.points ||
        right.wins - left.wins ||
        right.pointsDifference - left.pointsDifference ||
        right.pointsFor - left.pointsFor ||
        left.cartolaTeamName.localeCompare(right.cartolaTeamName)
      );
    })
  return ranked.map((standing, index) => ({
    ...standing,
    overallPosition: index + 1,
    qualificationBand:
      index < 24 ? "direct" : index < 32 ? "playoff" : "eliminated"
  }));
}

export default async function OverallClassificationPage() {
  const snapshot = await publicReadinessService.ensurePublicDataReady();
  const qualifiedStandings = rankOverallStandings(snapshot.standingsByGroup);

  return (
    <main className="shell public-home overall-classification">
      <PhaseHero
        title="Classificação geral"
        completedMatches={snapshot.completedMatches}
        totalMatches={snapshot.totalMatches}
      />

      <section className="card overall-classification__panel">
        <div className="card__header overall-classification__header">
          <div>
            <span className="overall-classification__eyebrow">Corte atual para a próxima fase</span>
            <h1 className="card__title">48 times na classificação geral</h1>
            <p className="muted">
              Critérios: pontos, vitórias, saldo de pontos e pontos pró.
            </p>
          </div>
          <Link href="/" className="text-link">
            voltar ao painel
          </Link>
        </div>

        <div className="overall-classification__summary">
          <article className="overall-classification__summary-card overall-classification__summary-card--direct">
            <span>Classificação direta</span>
            <strong>24 vagas</strong>
          </article>
          <article className="overall-classification__summary-card overall-classification__summary-card--playoff">
            <span>Na linha de corte</span>
            <strong>8 vagas</strong>
          </article>
          <article className="overall-classification__summary-card">
            <span>Rodada da classificação</span>
            <strong>{snapshot.standingsRoundLabel.replace(/(\d+)a rodada/, "$1ª rodada")}</strong>
          </article>
        </div>

        {qualifiedStandings.length > 0 ? (
          <>
            <div className="overall-classification__table-wrap">
              <table className="overall-classification__table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Time</th>
                    <th>Grupo</th>
                    <th>P</th>
                    <th>J</th>
                    <th>V</th>
                    <th>E</th>
                    <th>D</th>
                    <th>SP</th>
                    <th>PT</th>
                  </tr>
                </thead>
                <tbody>
                  {qualifiedStandings.map((standing) => (
                    <tr
                      key={standing.participantId}
                      className={
                        standing.qualificationBand === "direct"
                          ? "overall-classification__row overall-classification__row--direct"
                          : standing.qualificationBand === "playoff"
                            ? "overall-classification__row overall-classification__row--playoff"
                            : "overall-classification__row overall-classification__row--eliminated"
                      }
                    >
                      <td>{standing.overallPosition}</td>
                      <td>
                        <Link
                          href={`/times/${standing.participantId}?round=${snapshot.standingsRoundNumber}`}
                          className="team-cell"
                        >
                          <FlagBadge country={standing.country} />
                          <span className="team-cell__copy">
                            <strong>{standing.cartolaTeamName}</strong>
                            <span className="muted">{standing.country}</span>
                          </span>
                        </Link>
                      </td>
                      <td>Grupo {standing.groupCode}</td>
                      <td>{standing.points}</td>
                      <td>{standing.matchesPlayed}</td>
                      <td>{standing.wins}</td>
                      <td>{standing.draws}</td>
                      <td>{standing.losses}</td>
                      <td>{standing.pointsDifference.toFixed(2)}</td>
                      <td>{standing.pointsFor.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overall-classification__legend">
              <span>
                <i className="overall-classification__legend-dot overall-classification__legend-dot--direct" />
                entre os 24 melhores
              </span>
              <span>
                <i className="overall-classification__legend-dot overall-classification__legend-dot--playoff" />
                entre os 8 seguintes
              </span>
              <span>
                <i className="overall-classification__legend-dot overall-classification__legend-dot--eliminated" />
                fora da zona de classificação
              </span>
            </div>
          </>
        ) : (
          <EmptyState
            title="Sem classificação disponível"
            description="A classificação geral aparece quando houver confrontos processados."
          />
        )}
      </section>
    </main>
  );
}
