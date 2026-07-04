import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSecondPhaseControls } from "@/components/admin/AdminSecondPhaseControls";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSyncControls } from "@/components/admin/AdminSyncControls";
import { requireAdminSession } from "@/server/auth/guards";
import { SecondPhaseService } from "@/server/services/second-phase.service";
import { SyncService } from "@/server/services/sync.service";

export const dynamic = "force-dynamic";

const syncService = new SyncService();
const secondPhaseService = new SecondPhaseService();

export default async function AdminDashboardPage() {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  try {
    const [status, secondPhaseStatus] = await Promise.all([
      syncService.getAdminStatus(),
      secondPhaseService.getStatus()
    ]);

    return (
      <AdminShell
        title="Painel de sincronizacao"
        subtitle="Monitore o estado oficial da liga, acompanhe a ultima execucao e dispare o sync manual quando necessario."
        activePath="/admin/dashboard"
      >
        <section className="page-grid page-grid--split">
          <article className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Estado atual</h2>
                <span className="muted">Resumo operacional do tracker</span>
              </div>
              <span className="badge">
                {status.config.is_enabled ? "sync ativo" : "sync pausado"}
              </span>
            </div>

            <div className="admin-stats">
              <div className="admin-stat">
                <strong>Rodada atual</strong>
                <span>{status.currentRound?.name ?? "Nao definida"}</span>
                <small className="muted">{formatStatus(status.currentRound?.status)}</small>
              </div>
              <div className="admin-stat">
                <strong>Rodada oficial</strong>
                <span>{status.officialRound?.name ?? "Nenhuma"}</span>
                <small className="muted">
                  {formatDateTime(status.officialRound?.officialized_at)}
                </small>
              </div>
              <div className="admin-stat">
                <strong>Ultimo sync de rodada</strong>
                <span>{status.lastSyncedRound?.name ?? "Nenhum"}</span>
                <small className="muted">
                  {formatDateTime(status.lastSyncedRound?.last_synced_at)}
                </small>
              </div>
              <div className="admin-stat">
                <strong>Intervalo automatico</strong>
                <span>{status.config.interval_minutes} minutos</span>
                <small className="muted">Modo access-driven com fallback manual</small>
              </div>
            </div>

            <div style={{ height: 18 }} />
            <AdminSyncControls
              isEnabled={status.config.is_enabled}
              intervalMinutes={status.config.interval_minutes}
            />
          </article>

          <article className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Segunda fase</h2>
                <span className="muted">
                  Gere os confrontos dos 16 avos com a classificacao final dos grupos
                </span>
              </div>
              <span className="badge">
                {secondPhaseStatus.roundOf16GeneratedMatches > 0
                  ? "oitavas geradas"
                  : secondPhaseStatus.generatedMatches > 0
                    ? "segunda fase gerada"
                    : "pendente"}
              </span>
            </div>

            <AdminSecondPhaseControls
              generatedMatches={secondPhaseStatus.generatedMatches}
              roundOf16GeneratedMatches={secondPhaseStatus.roundOf16GeneratedMatches}
            />
          </article>

          <article className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Ultima execucao</h2>
                <span className="muted">Resultado mais recente do processo de sync</span>
              </div>
            </div>

            {status.latestExecution ? (
              <div className="admin-log">
                <p>
                  <strong>Status:</strong> {status.latestExecution.status}
                </p>
                <p>
                  <strong>Origem:</strong> {status.latestExecution.trigger_type}
                </p>
                <p>
                  <strong>Inicio:</strong> {formatDateTime(status.latestExecution.started_at)}
                </p>
                <p>
                  <strong>Fim:</strong> {formatDateTime(status.latestExecution.finished_at)}
                </p>
                <p>
                  <strong>Resumo:</strong> {status.latestExecution.summary_message}
                </p>
                <p>
                  <strong>Rodada afetada:</strong>{" "}
                  {status.latestExecution.rounds?.id ? (
                    <Link className="text-link" href={`/admin/rodadas/${status.latestExecution.rounds.id}`}>
                      {status.latestExecution.rounds.name}
                    </Link>
                  ) : (
                    "nao vinculada"
                  )}
                </p>
                <p>
                  <Link className="text-link" href={`/admin/execucoes/${status.latestExecution.id}`}>
                    ver detalhe da execucao
                  </Link>
                </p>
              </div>
            ) : (
              <p className="muted">Nenhuma execucao registrada ainda.</p>
            )}
          </article>
        </section>

        <section className="page-grid page-grid--split">
          <article className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Snapshot persistido</h2>
                <span className="muted">
                  Volume atual do espelho local usado pelo painel publico
                </span>
              </div>
            </div>

            <div className="admin-stats">
              <div className="admin-stat">
                <strong>Confrontos</strong>
                <span>{status.persistedSnapshotCounts.matches}</span>
                <small className="muted">esperado para grupos: {status.totalMatches}</small>
              </div>
              <div className="admin-stat">
                <strong>Classificacoes</strong>
                <span>{status.persistedSnapshotCounts.standings}</span>
                <small className="muted">snapshots de tabela por rodada consolidada</small>
              </div>
              <div className="admin-stat">
                <strong>Escalacoes</strong>
                <span>{status.persistedSnapshotCounts.lineupSnapshots}</span>
                <small className="muted">
                  {status.persistedSnapshotCounts.lineupPlayers} jogadores persistidos
                </small>
              </div>
              <div className="admin-stat">
                <strong>Mais escalados</strong>
                <span>{status.persistedSnapshotCounts.mostPicked}</span>
                <small className="muted">ranking agregado por rodada</small>
              </div>
            </div>
          </article>

          <article className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Historico recente</h2>
                <span className="muted">Ultimas execucoes registradas no banco local</span>
              </div>
            </div>

            {status.recentExecutions.length > 0 ? (
              <div className="admin-history">
                {status.recentExecutions.map((execution) => (
                  <article className="admin-history__item" key={execution.id}>
                    <div className="admin-history__top">
                      <span className={badgeClassForExecution(execution.status)}>
                        {execution.status}
                      </span>
                      <span className="muted">{formatDateTime(execution.started_at)}</span>
                    </div>
                    <strong>{execution.rounds?.name ?? "execucao sem rodada vinculada"}</strong>
                    <span className="muted">{execution.summary_message}</span>
                    <span className="muted">
                      origem: {execution.trigger_type} | fim: {formatDateTime(execution.finished_at)}
                    </span>
                    <div className="section-actions">
                      <Link className="text-link" href={`/admin/execucoes/${execution.id}`}>
                        ver execucao
                      </Link>
                      {execution.rounds?.id ? (
                        <Link className="text-link" href={`/admin/rodadas/${execution.rounds.id}`}>
                          ver rodada
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Nenhuma execucao registrada ainda.</p>
            )}
          </article>
        </section>
      </AdminShell>
    );
  } catch (error) {
    return (
      <AdminShell
        title="Painel de sincronizacao"
        subtitle="O painel administrativo depende da base local para carregar o estado operacional."
        activePath="/admin/dashboard"
      >
        <section className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Base local indisponivel</h2>
              <span className="muted">
                Nao foi possivel conectar ao Supabase configurado em `.env.local`.
              </span>
            </div>
          </div>
          <p className="muted">
            Verifique se o banco local esta ativo em `127.0.0.1:54321` antes de abrir o painel.
          </p>
          <p className="muted">{formatErrorMessage(error)}</p>
        </section>
      </AdminShell>
    );
  }
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

function formatStatus(status?: string) {
  if (!status) {
    return "sem status";
  }

  return (
    {
      scheduled: "aguardando rodada",
      live: "rodada em andamento",
      official: "rodada oficializada",
      sync_failed: "falha no sync"
    }[status] ?? status
  );
}

function badgeClassForExecution(status: string) {
  if (status === "success") {
    return "badge badge--official";
  }

  if (status === "failed") {
    return "badge badge--warning";
  }

  return "badge";
}

function formatErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Falha desconhecida");
  }

  return error instanceof Error ? error.message : "Falha desconhecida";
}
