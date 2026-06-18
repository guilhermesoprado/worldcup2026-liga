import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/server/auth/guards";
import { AdminHistoryService } from "@/server/services/admin-history.service";

export const dynamic = "force-dynamic";

const historyService = new AdminHistoryService();

export default async function AdminRoundDetailPage({
  params
}: {
  params: Promise<{ roundId: string }>;
}) {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const { roundId } = await params;
  const detail = await historyService.getRoundDetail(roundId);

  return (
    <AdminShell
      title={`Rodada ${detail.round.name}`}
      subtitle="Resumo persistido da rodada com confrontos, tabela, escalacoes e ranking agregado."
      activePath="/admin/dashboard"
    >
      <section className="page-grid page-grid--split">
        <article className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Resumo da rodada</h2>
              <span className="muted">Estado salvo no banco local</span>
            </div>
          </div>

          <div className="admin-stats">
            <div className="admin-stat">
              <strong>Status</strong>
              <span>{detail.round.status}</span>
              <small className="muted">market status: {detail.round.market_status ?? "-"}</small>
            </div>
            <div className="admin-stat">
              <strong>Confrontos</strong>
              <span>{detail.counts.matches}</span>
              <small className="muted">{detail.matches.filter((match) => match.state !== "scheduled").length} com pontos computados</small>
            </div>
            <div className="admin-stat">
              <strong>Escalacoes</strong>
              <span>{detail.counts.lineups}</span>
              <small className="muted">{detail.counts.mostPicked} registros de mais escalados</small>
            </div>
            <div className="admin-stat">
              <strong>Execucoes vinculadas</strong>
              <span>{detail.recentExecutions.length}</span>
              <small className="muted">historico recente desta rodada</small>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Execucoes da rodada</h2>
              <span className="muted">Drill-down do historico associado</span>
            </div>
          </div>

          {detail.recentExecutions.length > 0 ? (
            <div className="admin-history">
              {detail.recentExecutions.map((execution) => (
                <article className="admin-history__item" key={execution.id}>
                  <div className="admin-history__top">
                    <span className="badge">{execution.status}</span>
                    <span className="muted">{formatDateTime(execution.started_at)}</span>
                  </div>
                  <strong>{execution.summary_message}</strong>
                  <Link className="text-link" href={`/admin/execucoes/${execution.id}`}>
                    ver execucao
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhuma execucao recente vinculada a esta rodada.</p>
          )}
        </article>
      </section>

      <section className="page-grid page-grid--split">
        <article className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Confrontos persistidos</h2>
              <span className="muted">Amostra operacional desta rodada</span>
            </div>
          </div>

          <div className="admin-history">
            {detail.matches.slice(0, 12).map((match) => (
              <article className="admin-history__item" key={match.id}>
                <div className="admin-history__top">
                  <span className="badge">{match.groupCode}</span>
                  <span className="muted">{match.state}</span>
                </div>
                <strong>
                  {match.home?.country ?? "?"} x {match.away?.country ?? "?"}
                </strong>
                <span className="muted">
                  {(typeof match.homePoints === "number" ? match.homePoints.toFixed(2) : "-") +
                    " x " +
                    (typeof match.awayPoints === "number" ? match.awayPoints.toFixed(2) : "-")}
                </span>
              </article>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Top snapshots</h2>
              <span className="muted">Melhores escalacoes e mais escalados da rodada</span>
            </div>
          </div>

          <div className="admin-history">
            {detail.topLineups.slice(0, 5).map((lineup) => (
              <article className="admin-history__item" key={lineup.id}>
                <strong>{lineup.participant?.country ?? "?"}</strong>
                <span className="muted">{lineup.participant?.cartolaTeamName ?? "time nao encontrado"}</span>
                <span className="muted">{Number(lineup.totalPoints).toFixed(2)} pontos</span>
              </article>
            ))}
            {detail.mostPicked.slice(0, 5).map((player) => (
              <article className="admin-history__item" key={`athlete-${player.athleteId}`}>
                <strong>{player.rankPosition}. {player.playerName}</strong>
                <span className="muted">{player.positionName ?? "sem posicao"} · {player.clubName ?? "sem clube"}</span>
                <span className="muted">{player.pickCount} escalacoes</span>
              </article>
            ))}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "sem historico";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
