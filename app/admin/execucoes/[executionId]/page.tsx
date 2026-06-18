import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/server/auth/guards";
import { AdminHistoryService } from "@/server/services/admin-history.service";

export const dynamic = "force-dynamic";

const historyService = new AdminHistoryService();

export default async function AdminExecutionDetailPage({
  params
}: {
  params: Promise<{ executionId: string }>;
}) {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const { executionId } = await params;
  const detail = await historyService.getExecutionDetail(executionId);

  return (
    <AdminShell
      title="Detalhe da execucao"
      subtitle="Auditoria do sync com contexto da rodada afetada e resumo do snapshot persistido."
      activePath="/admin/dashboard"
    >
      <section className="page-grid page-grid--split">
        <article className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Execucao</h2>
              <span className="muted">Metadados completos desta sincronizacao</span>
            </div>
            {detail.round ? (
              <Link className="text-link" href={`/admin/rodadas/${detail.round.id}`}>
                abrir rodada
              </Link>
            ) : null}
          </div>

          <div className="admin-log">
            <p><strong>Status:</strong> {detail.execution.status}</p>
            <p><strong>Origem:</strong> {detail.execution.trigger_type}</p>
            <p><strong>Inicio:</strong> {formatDateTime(detail.execution.started_at)}</p>
            <p><strong>Fim:</strong> {formatDateTime(detail.execution.finished_at)}</p>
            <p><strong>Resumo:</strong> {detail.execution.summary_message}</p>
            <p><strong>Round id:</strong> {detail.execution.affected_round_id ?? "nao vinculada"}</p>
          </div>
        </article>

        <article className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Rodada associada</h2>
              <span className="muted">Contexto operacional no momento da execucao</span>
            </div>
          </div>

          {detail.round ? (
            <div className="admin-stats">
              <div className="admin-stat">
                <strong>Nome</strong>
                <span>{detail.round.name}</span>
                <small className="muted">{detail.round.status}</small>
              </div>
              <div className="admin-stat">
                <strong>Ultimo sync</strong>
                <span>{formatDateTime(detail.round.last_synced_at)}</span>
                <small className="muted">market status: {detail.round.market_status ?? "-"}</small>
              </div>
              <div className="admin-stat">
                <strong>Volume persistido</strong>
                <span>{detail.roundSummary?.counts.matches ?? 0} confrontos</span>
                <small className="muted">
                  {detail.roundSummary?.counts.lineups ?? 0} escalacoes e {detail.roundSummary?.counts.standings ?? 0} classificacoes
                </small>
              </div>
            </div>
          ) : (
            <p className="muted">Esta execucao nao possui rodada vinculada.</p>
          )}
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
