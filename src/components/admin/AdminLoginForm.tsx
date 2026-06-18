"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

export function AdminLoginForm({
  defaultEmail
}: {
  defaultEmail: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });
        const body = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(body.message ?? "Falha ao autenticar");
        }

        setMessage("Login realizado. Redirecionando...");
        router.replace("/admin/dashboard");
        router.refresh();
        window.location.assign("/admin/dashboard");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha inesperada.");
      }
    });
  };

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <label className="admin-field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isPending}
          required
        />
      </label>

      <label className="admin-field">
        <span>Senha</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isPending}
          required
        />
      </label>

      <div className="admin-actions">
        <button type="submit" className="admin-button" disabled={isPending}>
          {isPending ? "entrando..." : "entrar no painel"}
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </div>
    </form>
  );
}
