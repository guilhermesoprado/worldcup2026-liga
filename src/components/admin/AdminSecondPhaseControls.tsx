"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminSecondPhaseControls({
  generatedMatches,
  roundOf16GeneratedMatches
}: {
  generatedMatches: number;
  roundOf16GeneratedMatches: number;
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

  const generateRoundOf16 = () => {
    setMessage(null);

    if (
      roundOf16GeneratedMatches > 0 &&
      !window.confirm(
        "As oitavas de final ja possuem confrontos gerados. Deseja substituir todos os confrontos atuais?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/round-of-16", {
          method: "POST"
        });
        const body = (await response.json()) as {
          generatedMatches?: number;
          sourceRoundName?: string;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(body.message ?? "Falha ao gerar oitavas de final");
        }

        setMessage(
          `${body.generatedMatches ?? 0} confrontos de oitavas gerados a partir de ${body.sourceRoundName ?? "segunda fase"}.`
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
      <button
        type="button"
        className="admin-button admin-button--ghost"
        onClick={generateRoundOf16}
        disabled={isPending || generatedMatches < 16}
      >
        {isPending ? "gerando..." : "gerar oitavas de final"}
      </button>
      <p className="muted">
        {roundOf16GeneratedMatches > 0
          ? `${roundOf16GeneratedMatches} confrontos de oitavas ja persistidos.`
          : "As oitavas serao geradas a partir dos vencedores oficiais da segunda fase."}
      </p>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
