import { describe, expect, it } from "vitest";
import { resolveMarketState } from "@/domain/sync/market-state";

describe("resolveMarketState", () => {
  it("treats status_mercado=2 as a closed market partial round", () => {
    const state = resolveMarketState({
      rodada_atual: 2,
      status_mercado: 2,
      game_over: false,
      mercado_pos_rodada: false,
      bola_rolando: true,
      times_escalados: null,
      rodada_final: null,
      fechamento: null
    });

    expect(state.marketMode).toBe("closed");
    expect(state.partialRoundNumber).toBe(2);
    expect(state.officialRoundNumber).toBe(1);
    expect(state.displayRoundNumber).toBe(2);
  });

  it("treats status_mercado=1 as an open market officialized state", () => {
    const state = resolveMarketState({
      rodada_atual: 3,
      status_mercado: 1,
      game_over: false,
      mercado_pos_rodada: true,
      bola_rolando: false,
      times_escalados: null,
      rodada_final: null,
      fechamento: null
    });

    expect(state.marketMode).toBe("open");
    expect(state.partialRoundNumber).toBeNull();
    expect(state.officialRoundNumber).toBe(2);
    expect(state.displayRoundNumber).toBe(2);
  });
});
