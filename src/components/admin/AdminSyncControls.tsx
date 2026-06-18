"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminSyncControls({
  isEnabled,
  intervalMinutes
}: {
  isEnabled: boolean;
  intervalMinutes: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAction = (action: "sync" | "toggle") => {
    setMessage(null);

    startTransition(async () => {
      try {
        if (action === "sync") {
          const response = await fetch("/api/admin/sync", {
            method: "POST"
          });
          const body = (await response.json()) as { execution?: { summary_message?: string }; message?: string };

          if (!response.ok) {
            throw new Error(body.message ?? "Falha ao executar sync");
          }

          setMessage(body.execution?.summary_message ?? "Sync concluido com sucesso.");
        } else {
          const response = await fetch("/api/admin/settings", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              isEnabled: !isEnabled,
              intervalMinutes
            })
          });
          const body = (await response.json()) as { message?: string };

          if (!response.ok) {
            throw new Error(body.message ?? "Falha ao atualizar configuracao");
          }

          setMessage(!isEnabled ? "Sincronizacao retomada." : "Sincronizacao pausada.");
        }

        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha inesperada.");
      }
    });
  };

  return (
    <div className="admin-actions">
      <button
        type="button"
        className="admin-button"
        onClick={() => runAction("sync")}
        disabled={isPending}
      >
        {isPending ? "processando..." : "sync now"}
      </button>
      <button
        type="button"
        className="admin-button admin-button--ghost"
        onClick={() => runAction("toggle")}
        disabled={isPending}
      >
        {isEnabled ? "pausar sync" : "retomar sync"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
