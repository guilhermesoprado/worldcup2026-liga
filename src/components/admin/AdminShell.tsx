import type { ReactNode } from "react";
import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

export function AdminShell({
  title,
  subtitle,
  activePath,
  children
}: {
  title: string;
  subtitle: string;
  activePath: "/admin/dashboard" | "/admin/configuracoes";
  children: ReactNode;
}) {
  return (
    <main className="shell admin-theme">
      <section className="hero hero--admin">
        <div className="admin-hero__top">
          <div>
            <span className="hero__eyebrow">Area administrativa</span>
            <h1>{title}</h1>
            <p className="admin-hero__subtitle">{subtitle}</p>
          </div>
          <AdminLogoutButton />
        </div>

        <nav className="admin-nav" aria-label="Navegacao do painel">
          <Link
            href="/admin/dashboard"
            className={activePath === "/admin/dashboard" ? "admin-nav__link admin-nav__link--active" : "admin-nav__link"}
          >
            dashboard
          </Link>
          <Link
            href="/admin/configuracoes"
            className={activePath === "/admin/configuracoes" ? "admin-nav__link admin-nav__link--active" : "admin-nav__link"}
          >
            configuracoes
          </Link>
        </nav>
      </section>

      {children}
    </main>
  );
}
