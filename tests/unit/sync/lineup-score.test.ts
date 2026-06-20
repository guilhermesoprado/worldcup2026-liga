import { describe, expect, it } from "vitest";
import {
  buildAthletePartialIndex,
  buildPartialLineupSnapshot
} from "@/domain/sync/lineup-score";

describe("buildPartialLineupSnapshot", () => {
  it("applies reserve substitution and captain 1.5x multiplier", () => {
    const partialIndex = buildAthletePartialIndex({
      atletas: {
        "10": {
          apelido: "Capitao",
          pontuacao: 8,
          posicao_id: 4,
          clube_id: 1,
          entrou_em_campo: true
        },
        "30": {
          apelido: "Reserva",
          pontuacao: 6,
          posicao_id: 3,
          clube_id: 1,
          entrou_em_campo: true
        }
      }
    });

    const snapshot = buildPartialLineupSnapshot({
      roundNumber: 2,
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
            entrou_em_campo: true,
            pontos_num: null,
            rodada_id: 2
          },
          {
            atleta_id: 20,
            apelido: "Titular Ausente",
            posicao_id: 3,
            clube_id: 1,
            entrou_em_campo: false,
            pontos_num: null,
            rodada_id: 2
          }
        ],
        reservas: [
          {
            atleta_id: 30,
            apelido: "Reserva",
            posicao_id: 3,
            clube_id: 1,
            entrou_em_campo: true,
            pontos_num: null,
            rodada_id: 2
          }
        ],
        capitao_id: 10,
        reserva_luxo_id: null
      },
      athleteCatalog: new Map(),
      market: null,
      partialIndex
    });

    expect(snapshot.effectivePlayers.map((player) => player.athleteId)).toEqual([10, 30]);
    expect(snapshot.totalPoints).toBe(18);
  });
});
