import type { CartolaMarketStatusPayload } from "@/lib/cartola/mappers";

export type MarketMode = "open" | "closed" | "maintenance" | "unknown";

export type MarketState = {
  apiCurrentRoundNumber: number;
  displayRoundNumber: number;
  marketMode: MarketMode;
  marketStatusCode: number;
  officialRoundNumber: number;
  partialRoundNumber: number | null;
  shouldForceSync: boolean;
};

export function resolveMarketState(
  marketStatus: CartolaMarketStatusPayload
): MarketState {
  const marketStatusCode = marketStatus.status_mercado;
  const apiCurrentRoundNumber = marketStatus.rodada_atual;
  const officialRoundNumber = Math.max(apiCurrentRoundNumber - 1, 0);

  if (marketStatusCode === 2) {
    return {
      apiCurrentRoundNumber,
      displayRoundNumber: apiCurrentRoundNumber,
      marketMode: "closed",
      marketStatusCode,
      officialRoundNumber,
      partialRoundNumber: apiCurrentRoundNumber,
      shouldForceSync: true
    };
  }

  if (marketStatusCode === 1) {
    return {
      apiCurrentRoundNumber,
      displayRoundNumber:
        officialRoundNumber > 0 ? officialRoundNumber : apiCurrentRoundNumber,
      marketMode: "open",
      marketStatusCode,
      officialRoundNumber,
      partialRoundNumber: null,
      shouldForceSync: true
    };
  }

  return {
    apiCurrentRoundNumber,
    displayRoundNumber:
      officialRoundNumber > 0 ? officialRoundNumber : apiCurrentRoundNumber,
    marketMode: marketStatusCode === 4 ? "maintenance" : "unknown",
    marketStatusCode,
    officialRoundNumber,
    partialRoundNumber: null,
    shouldForceSync: false
  };
}

export function formatRoundLabel(roundNumber: number) {
  return `${roundNumber}a rodada`;
}
