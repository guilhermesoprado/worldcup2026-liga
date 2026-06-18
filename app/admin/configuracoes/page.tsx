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
}
