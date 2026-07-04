"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminSyncControls({
  isEnabled,
  intervalMinutes,
  reprocessableRounds
}: {
  isEnabled: boolean;
  intervalMinutes: number;
  reprocessableRounds: Array<{
    externalRoundId: number;
    name: string;
    status: string;
  }>;
}) {
  const router = useRouter();
  const [selectedRoundNumber, setSelectedRoundNumber] = useState(
    String(reprocessableRounds.at(-1)?.externalRoundId ?? "")
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAction = (action: "sync" | "sync_round" | "toggle") => {
    setMessage(null);

    startTransition(async () => {
      try {
        if (action === "sync" || action === "sync_round") {
          const response = await fetch("/api/admin/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body:
              action === "sync_round"
                ? JSON.stringify({ mode: "round", roundNumber: Number(selectedRoundNumber) })
                : undefined
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
      <label className="admin-field">
        <span>Rodada para reprocessar</span>
        <select
          value={selectedRoundNumber}
          onChange={(event) => setSelectedRoundNumber(event.target.value)}
          disabled={isPending || reprocessableRounds.length === 0}
        >
          {reprocessableRounds.map((round) => (
            <option key={round.externalRoundId} value={round.externalRoundId}>
              {round.name} ({round.status})
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="admin-button"
        onClick={() => runAction("sync_round")}
        disabled={isPending || selectedRoundNumber.length === 0}
      >
        {isPending ? "processando..." : "reprocessar rodada"}
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
