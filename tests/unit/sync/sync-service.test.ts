import { describe, expect, it } from "vitest";
import { buildAthletePartialIndex } from "@/domain/sync/lineup-score";
import { SyncService } from "@/server/services/sync.service";

describe("SyncService normalizeLineupSnapshot", () => {
  it("accepts partial lineup when athlete rodada_id is stale", () => {
    const service = new SyncService() as unknown as {
      normalizeLineupSnapshot: (input: {
        requestedRoundNumber: number;
        lineup: {
          time: { time_id: number; nome: string; nome_cartola: string };
          pontos: number | null;
          patrimonio: number | null;
          atletas: Array<{
            atleta_id: number;
            apelido: string;
            pontos_num?: number | null;
            posicao_id: number;
            clube_id: number;
            rodada_id?: number | null;
            entrou_em_campo?: boolean | null;
          }>;
          reservas: Array<{
            atleta_id: number;
            apelido: string;
            pontos_num?: number | null;
            posicao_id: number;
            clube_id: number;
            rodada_id?: number | null;
            entrou_em_campo?: boolean | null;
          }>;
          capitao_id?: number | null;
          reserva_luxo_id?: number | null;
        };
        athleteCatalog: Map<number, { clubId: number; positionId: number; name: string }>;
        market: null;
        partialIndex: ReturnType<typeof buildAthletePartialIndex>;
        startedClubIds: Set<number>;
        state: "partial" | "official";
      }) => { totalPoints: number } | null;
    };

    const normalized = service.normalizeLineupSnapshot({
      requestedRoundNumber: 2,
      lineup: {
        time: {
          time_id: 1,
          nome: "Time",
          nome_cartola: "Cartoleiro"
        },
        pontos: null,
        patrimonio: null,
        atletas: [
          {
            atleta_id: 10,
            apelido: "Capitao",
            posicao_id: 4,
            clube_id: 1,
            rodada_id: 1,
            entrou_em_campo: true
          }
        ],
        reservas: [],
        capitao_id: 10,
        reserva_luxo_id: null
      },
      athleteCatalog: new Map(),
      market: null,
      partialIndex: buildAthletePartialIndex({
        atletas: {
          "10": {
            apelido: "Capitao",
            pontuacao: 8,
            posicao_id: 4,
            clube_id: 1,
            entrou_em_campo: true
          }
        }
      }),
      startedClubIds: new Set([1]),
      state: "partial"
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.totalPoints).toBe(12);
  });

  it("still rejects explicit round mismatch for official lineup", () => {
    const service = new SyncService() as unknown as {
      normalizeLineupSnapshot: (input: {
        requestedRoundNumber: number;
        lineup: {
          time: { time_id: number; nome: string; nome_cartola: string };
          pontos: number | null;
          patrimonio: number | null;
          atletas: Array<{
            atleta_id: number;
            apelido: string;
            pontos_num?: number | null;
            posicao_id: number;
            clube_id: number;
            rodada_id?: number | null;
            entrou_em_campo?: boolean | null;
          }>;
          reservas: Array<{
            atleta_id: number;
            apelido: string;
            pontos_num?: number | null;
            posicao_id: number;
            clube_id: number;
            rodada_id?: number | null;
            entrou_em_campo?: boolean | null;
          }>;
          capitao_id?: number | null;
          reserva_luxo_id?: number | null;
        };
        athleteCatalog: Map<number, { clubId: number; positionId: number; name: string }>;
        market: null;
        partialIndex: ReturnType<typeof buildAthletePartialIndex>;
        startedClubIds: Set<number>;
        state: "partial" | "official";
      }) => { totalPoints: number } | null;
    };

    const normalized = service.normalizeLineupSnapshot({
      requestedRoundNumber: 1,
      lineup: {
        time: {
          time_id: 1,
          nome: "Time",
          nome_cartola: "Cartoleiro"
        },
        pontos: 77,
        patrimonio: null,
        atletas: [
          {
            atleta_id: 10,
            apelido: "Titular",
            posicao_id: 4,
            clube_id: 1,
            pontos_num: 7,
            rodada_id: 2,
            entrou_em_campo: true
          }
        ],
        reservas: [],
        capitao_id: 10,
        reserva_luxo_id: null
      },
      athleteCatalog: new Map(),
      market: null,
      partialIndex: buildAthletePartialIndex({ atletas: {} }),
      startedClubIds: new Set(),
      state: "official"
    });

    expect(normalized).toBeNull();
  });
});
