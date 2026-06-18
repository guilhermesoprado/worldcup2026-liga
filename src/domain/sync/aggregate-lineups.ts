import type { CartolaLineupPayload } from "@/lib/cartola/mappers";

export function aggregateLineupTotal(lineup: CartolaLineupPayload) {
  if (typeof lineup.pontos === "number") {
    return lineup.pontos;
  }

  return lineup.atletas.reduce((total, athlete) => total + (athlete.pontos_num ?? 0), 0);
}

