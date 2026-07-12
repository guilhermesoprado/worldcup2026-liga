"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminSecondPhaseControls({
  generatedMatches,
  roundOf16GeneratedMatches,
  quarterFinalsGeneratedMatches,
  semiFinalsGeneratedMatches,
  finalGeneratedMatches
}: {
  generatedMatches: number;
  roundOf16GeneratedMatches: number;
  quarterFinalsGeneratedMatches: number;
  semiFinalsGeneratedMatches: number;
  finalGeneratedMatches: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [roundOf16Logs, setRoundOf16Logs] = useState<string[]>([]);
  const [quarterFinalsLogs, setQuarterFinalsLogs] = useState<string[]>([]);
  const [semiFinalsLogs, setSemiFinalsLogs] = useState<string[]>([]);
  const [finalLogs, setFinalLogs] = useState<string[]>([]);
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
    setRoundOf16Logs([]);

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
          logs?: string[];
          details?: { logs?: string[] };
        };
        const logs = body.logs ?? body.details?.logs ?? [];

        if (!response.ok) {
          setMessage(body.message ?? "Falha ao gerar oitavas de final");
          setRoundOf16Logs(logs);
          return;
        }

        setMessage(
          `${body.generatedMatches ?? 0} confrontos de oitavas gerados a partir de ${body.sourceRoundName ?? "segunda fase"}.`
        );
        setRoundOf16Logs(logs);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha inesperada.");
      }
    });
  };

  const generateQuarterFinals = () => {
    setMessage(null);
    setQuarterFinalsLogs([]);

    if (
      quarterFinalsGeneratedMatches > 0 &&
      !window.confirm(
        "As quartas de final ja possuem confrontos gerados. Deseja substituir todos os confrontos atuais?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/quarter-finals", {
          method: "POST"
        });
        const body = (await response.json()) as {
          generatedMatches?: number;
          sourceRoundName?: string;
          message?: string;
          logs?: string[];
          details?: { logs?: string[] };
        };
        const logs = body.logs ?? body.details?.logs ?? [];

        if (!response.ok) {
          setMessage(body.message ?? "Falha ao gerar quartas de final");
          setQuarterFinalsLogs(logs);
          return;
        }

        setMessage(
          `${body.generatedMatches ?? 0} confrontos de quartas gerados a partir de ${body.sourceRoundName ?? "oitavas de final"}.`
        );
        setQuarterFinalsLogs(logs);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha inesperada.");
      }
    });
  };

  const generateSemiFinals = () => {
    setMessage(null);
    setSemiFinalsLogs([]);

    if (
      semiFinalsGeneratedMatches > 0 &&
      !window.confirm(
        "As semifinais ja possuem confrontos gerados. Deseja substituir todos os confrontos atuais?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/semi-finals", {
          method: "POST"
        });
        const body = (await response.json()) as {
          generatedMatches?: number;
          sourceRoundName?: string;
          message?: string;
          logs?: string[];
          details?: { logs?: string[] };
        };
        const logs = body.logs ?? body.details?.logs ?? [];

        if (!response.ok) {
          setMessage(body.message ?? "Falha ao gerar semifinais");
          setSemiFinalsLogs(logs);
          return;
        }

        setMessage(
          `${body.generatedMatches ?? 0} confrontos de semifinais gerados a partir de ${body.sourceRoundName ?? "quartas de final"}.`
        );
        setSemiFinalsLogs(logs);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha inesperada.");
      }
    });
  };

  const generateFinal = () => {
    setMessage(null);
    setFinalLogs([]);

    if (
      finalGeneratedMatches > 0 &&
      !window.confirm(
        "A final ja possui confronto gerado. Deseja substituir o confronto atual?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/final", {
          method: "POST"
        });
        const body = (await response.json()) as {
          generatedMatches?: number;
          sourceRoundName?: string;
          message?: string;
          logs?: string[];
          details?: { logs?: string[] };
        };
        const logs = body.logs ?? body.details?.logs ?? [];

        if (!response.ok) {
          setMessage(body.message ?? "Falha ao gerar final");
          setFinalLogs(logs);
          return;
        }

        setMessage(
          `${body.generatedMatches ?? 0} confronto da final gerado a partir de ${body.sourceRoundName ?? "semifinais"}.`
        );
        setFinalLogs(logs);
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
      <button
        type="button"
        className="admin-button admin-button--ghost"
        onClick={generateQuarterFinals}
        disabled={isPending || roundOf16GeneratedMatches < 8}
      >
        {isPending ? "gerando..." : "regenerar quartas de final"}
      </button>
      <p className="muted">
        {quarterFinalsGeneratedMatches > 0
          ? `${quarterFinalsGeneratedMatches} confrontos de quartas ja persistidos.`
          : "As quartas serao geradas automaticamente quando a rodada 6 estiver disponivel, com fallback manual por aqui."}
      </p>
      <button
        type="button"
        className="admin-button admin-button--ghost"
        onClick={generateSemiFinals}
        disabled={isPending || quarterFinalsGeneratedMatches < 4}
      >
        {isPending ? "gerando..." : "regenerar semifinais"}
      </button>
      <p className="muted">
        {semiFinalsGeneratedMatches > 0
          ? `${semiFinalsGeneratedMatches} confrontos de semifinais ja persistidos.`
          : "As semifinais serao geradas automaticamente quando a rodada 7 estiver disponivel, com fallback manual por aqui."}
      </p>
      <button
        type="button"
        className="admin-button admin-button--ghost"
        onClick={generateFinal}
        disabled={isPending || semiFinalsGeneratedMatches < 2}
      >
        {isPending ? "gerando..." : "regenerar final"}
      </button>
      <p className="muted">
        {finalGeneratedMatches > 0
          ? `${finalGeneratedMatches} confronto da final ja persistido.`
          : "A final sera gerada automaticamente quando a rodada 8 estiver disponivel, com fallback manual por aqui."}
      </p>
      {message ? <p className="muted">{message}</p> : null}
      {roundOf16Logs.length > 0 ? (
        <div className="admin-log">
          {roundOf16Logs.map((log) => (
            <p className="muted" key={log}>
              {log}
            </p>
          ))}
        </div>
      ) : null}
      {quarterFinalsLogs.length > 0 ? (
        <div className="admin-log">
          {quarterFinalsLogs.map((log) => (
            <p className="muted" key={log}>
              {log}
            </p>
          ))}
        </div>
      ) : null}
      {semiFinalsLogs.length > 0 ? (
        <div className="admin-log">
          {semiFinalsLogs.map((log) => (
            <p className="muted" key={log}>
              {log}
            </p>
          ))}
        </div>
      ) : null}
      {finalLogs.length > 0 ? (
        <div className="admin-log">
          {finalLogs.map((log) => (
            <p className="muted" key={log}>
              {log}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
