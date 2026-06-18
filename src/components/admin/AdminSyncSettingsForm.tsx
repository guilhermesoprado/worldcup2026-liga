"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

export function AdminSyncSettingsForm({
  isEnabled,
  intervalMinutes
}: {
  isEnabled: boolean;
  intervalMinutes: number;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(isEnabled);
  const [interval, setInterval] = useState(String(intervalMinutes));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            isEnabled: enabled,
            intervalMinutes: Number(interval)
          })
        });
        const body = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(body.message ?? "Falha ao salvar configuracao");
        }

        setMessage("Configuracoes salvas.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha inesperada.");
      }
    });
  };

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <label className="admin-field">
        <span>Sincronizacao automatica</span>
        <select
          value={enabled ? "enabled" : "disabled"}
          onChange={(event) => setEnabled(event.target.value === "enabled")}
          disabled={isPending}
        >
          <option value="enabled">Ativa</option>
          <option value="disabled">Pausada</option>
        </select>
      </label>

      <label className="admin-field">
        <span>Intervalo em minutos</span>
        <input
          type="number"
          min={1}
          max={180}
          value={interval}
          onChange={(event) => setInterval(event.target.value)}
          disabled={isPending}
        />
      </label>

      <div className="admin-actions">
        <button type="submit" className="admin-button" disabled={isPending}>
          {isPending ? "salvando..." : "salvar configuracoes"}
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </div>
    </form>
  );
}
