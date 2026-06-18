"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="admin-actions">
      <button
        type="button"
        className="admin-button admin-button--ghost"
        disabled={isPending}
        onClick={() => {
          setMessage(null);

          startTransition(async () => {
            try {
              const response = await fetch("/api/admin/auth", {
                method: "DELETE"
              });
              const body = (await response.json()) as { message?: string };

              if (!response.ok) {
                throw new Error(body.message ?? "Falha ao sair");
              }

              router.push("/admin/login");
              router.refresh();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Falha inesperada.");
            }
          });
        }}
      >
        {isPending ? "saindo..." : "sair"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
