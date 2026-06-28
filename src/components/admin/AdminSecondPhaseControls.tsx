"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminSecondPhaseControls({
  generatedMatches
}: {
  generatedMatches: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const generateSecondPhase = () => {
    setMessage(null);

    if (
      generatedMatches > 0 &&
      !window.confirm(
        "A segunda fase ja possui confrontos gerados. Deseja substituir todos os confrontos atuais?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/second-phase", {
          method: "POST"
        });
        const body = (await response.json()) as {
          generatedMatches?: number;
          sourceRoundName?: string;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(body.message ?? "Falha ao gerar segunda fase");
        }

        setMessage(
          `${body.generatedMatches ?? 0} confrontos gerados a partir de ${body.sourceRoundName ?? "classificacao final"}.`
        );
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
        onClick={generateSecondPhase}
        disabled={isPending}
      >
        {isPending ? "gerando..." : "gerar segunda fase"}
      </button>
      <p className="muted">
        {generatedMatches > 0
          ? `${generatedMatches} confrontos de segunda fase ja persistidos.`
          : "Nenhum confronto de segunda fase persistido ainda."}
      </p>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
