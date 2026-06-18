import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { readAdminSession } from "@/server/auth/session";
import { getEnv } from "@/types/env";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await readAdminSession();

  if (session === getEnv().ADMIN_EMAIL) {
    redirect("/admin/dashboard");
  }

  return (
    <main className="shell shell--narrow admin-theme">
      <section className="admin-login">
        <div className="admin-login__panel">
          <span className="hero__eyebrow">Area administrativa</span>
          <h1 className="admin-login__title">Entrar no painel</h1>
          <p className="admin-login__subtitle">
            Controle o sync oficial, acompanhe o ultimo processamento e ajuste o
            intervalo automatico do tracker.
          </p>

          <AdminLoginForm defaultEmail={getEnv().ADMIN_EMAIL} />
        </div>

        <aside className="admin-login__aside">
          <div className="admin-note">
            <strong>Ambiente local pronto</strong>
            <span>
              O painel usa o banco Supabase local persistido em Docker e segue a
              mesma estrutura preparada para producao.
            </span>
          </div>
          <div className="admin-note">
            <strong>Fluxo do admin</strong>
            <span>
              Login por email e senha, dashboard operacional, configuracoes do
              sync e acao manual de sincronizacao.
            </span>
          </div>
        </aside>
      </section>
    </main>
  );
}
