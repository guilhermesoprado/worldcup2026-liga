import Link from "next/link";
import { EmptyState } from "@/components/public/EmptyState";
import { FlagBadge } from "@/components/public/FlagBadge";
import { TeamDetailService } from "@/server/services/team-detail.service";

export const dynamic = "force-dynamic";

const teamDetailService = new TeamDetailService();

function formatRoundLabel(roundLabel: string) {
  return roundLabel.replace("a rodada", "ª rodada");
}

export default async function TeamDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ teamId: string }>;
  searchParams?: Promise<{ round?: string }>;
}) {
  const { teamId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const detail = await teamDetailService.getTeamDetail(teamId, resolvedSearchParams?.round);

  if (!("participantId" in detail)) {
    return (
      <main className="shell public-home">
        <section className="card public-page">
          <EmptyState
            title="Time nao encontrado"
            description="Nao foi possivel localizar o participante solicitado."
          />
        </section>
      </main>
    );
  }

  return (
    <main className="shell public-home">
      <section className="hero public-detail-hero">
        <div className="hero__glow" aria-hidden="true" />
        <div className="hero__content">
          <div className="public-detail-hero__top">
            <div className="public-detail-hero__identity">
              <FlagBadge country={detail.country} className="flag-badge--hero" />
              <div>
                <span className="hero__eyebrow">Escalacao oficial da liga</span>
                <h1>{detail.cartolaTeamName}</h1>
                <p className="admin-hero__subtitle">
                  {detail.country} · {detail.owner}
                </p>
              </div>
            </div>
            <div className="section-actions">
              <Link href="/" className="text-link">
                voltar ao painel
              </Link>
            </div>
          </div>

          <div className="public-detail-hero__stats public-detail-hero__stats--compact">
            <div className="public-kpi">
              <span className="public-kpi__label">Rodada</span>
              <strong>{formatRoundLabel(detail.roundLabel)}</strong>
            </div>
            <div className="public-kpi">
              <span className="public-kpi__label">Pontuacao total</span>
              <strong>{detail.totalPoints.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="public-page public-page__grid">
        <article className="card public-home__panel">
          <div className="card__header public-home__section-header">
            <div>
              <h2 className="card__title">Titulares</h2>
            </div>
          </div>
          <div className="lineup-list">
            {detail.starters.map((player) => (
              <article key={`starter-${player.athleteId}`} className="lineup-card">
                <div className="lineup-card__body">
                  <div>
                    <strong>{player.playerName}</strong>
                    <div className="lineup-card__meta">
                      {player.athleteId === detail.captainId ? (
                        <span className="lineup-inline-badge">Capitao</span>
                      ) : null}
                      {!player.entered ? (
                        <span className="lineup-inline-badge lineup-inline-badge--muted">
                          Substituido
                        </span>
                      ) : null}
                    </div>
                    <div className="muted">
                      {player.positionName} · {player.clubName}
                    </div>
                  </div>
                  <div className="lineup-card__points">
                    <span className="public-kpi__label">Pontos</span>
                    <strong>{player.points?.toFixed(2) ?? "--"}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="card public-home__panel">
          <div className="card__header public-home__section-header">
            <div>
              <h2 className="card__title">Reservas</h2>
            </div>
          </div>
          {detail.reserves.length > 0 ? (
            <div className="lineup-list">
              {detail.reserves.map((player) => (
                <article key={`reserve-${player.athleteId}`} className="lineup-card">
                  <div className="lineup-card__body">
                    <div>
                      <strong>{player.playerName}</strong>
                      <div className="lineup-card__meta">
                        {player.counted ? (
                          <span className="lineup-inline-badge">Entrou</span>
                        ) : null}
                      </div>
                      <div className="muted">
                        {player.positionName} · {player.clubName}
                      </div>
                    </div>
                    <div className="lineup-card__points">
                      <span className="public-kpi__label">Pontos</span>
                      <strong>{player.points?.toFixed(2) ?? "--"}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem reservas listados"
              description="A API oficial nao retornou reservas para esta rodada."
            />
          )}
        </article>
      </section>
    </main>
  );
}
