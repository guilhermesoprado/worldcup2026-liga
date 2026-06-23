import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSyncSettingsForm } from "@/components/admin/AdminSyncSettingsForm";
import { requireAdminSession } from "@/server/auth/guards";
import { SyncService } from "@/server/services/sync.service";

export const dynamic = "force-dynamic";

const syncService = new SyncService();

export default async function AdminSettingsPage() {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  try {
    const status = await syncService.getAdminStatus();

    return (
      <AdminShell
        title="Configuracoes de sincronizacao"
        subtitle="Ajuste a janela automatica do sync e mantenha a leitura publica alinhada ao snapshot persistido."
        activePath="/admin/configuracoes"
      >
        <section className="card">
          <div className="card__header">
            <div>
              <h1 className="card__title">Configuracoes de sincronizacao</h1>
              <span className="muted">
                Controle de pausa, retomada e intervalo do sync automatico
              </span>
            </div>
            <span className="badge">
              {status.config.is_enabled ? "sync ativo" : "sync pausado"}
            </span>
          </div>

          <AdminSyncSettingsForm
            isEnabled={status.config.is_enabled}
            intervalMinutes={status.config.interval_minutes}
          />
        </section>
      </AdminShell>
    );
  } catch (error) {
    return (
      <AdminShell
        title="Configuracoes de sincronizacao"
        subtitle="A base local precisa estar acessivel para editar a configuracao do sync."
        activePath="/admin/configuracoes"
      >
        <section className="card">
          <div className="card__header">
            <div>
              <h1 className="card__title">Base local indisponivel</h1>
              <span className="muted">
                Nao foi possivel conectar ao Supabase configurado em `.env.local`.
              </span>
            </div>
          </div>
          <p className="muted">
            Verifique se o banco local esta ativo em `127.0.0.1:54321` antes de editar as configuracoes.
          </p>
          <p className="muted">{formatErrorMessage(error)}</p>
        </section>
      </AdminShell>
    );
  }
}

function formatErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Falha desconhecida");
  }

  return error instanceof Error ? error.message : "Falha desconhecida";
}
