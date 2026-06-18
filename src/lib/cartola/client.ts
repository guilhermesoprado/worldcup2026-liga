import { getCartolaEnv } from "@/types/env";
import {
  cartolaAthletesMarketSchema,
  cartolaMarketStatusSchema,
  cartolaAthletesScoredSchema,
  cartolaFixturesSchema,
  cartolaLineupSchema,
  cartolaTeamSearchSchema
} from "@/lib/cartola/schemas";

const CARTOLA_COPA_BASE_URL = "https://api.copa.cartola.globo.com";

async function requestCartola<T>(
  baseUrl: string,
  path: string,
  schema: { parse: (input: unknown) => T }
) {
  const env = getCartolaEnv();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${env.CARTOLA_AUTH_TOKEN}`,
      "X-GLB-Token": env.CARTOLA_X_GLB_TAG,
      "X-GLB-APP": env.CARTOLA_X_GLB_APP,
      "X-GLB-AUTH": env.CARTOLA_X_GLB_AUTH,
      Origin: "https://cartola.globo.com",
      Referer: "https://cartola.globo.com/",
      "User-Agent": "Mozilla/5.0"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Cartola request failed for ${path} with status ${response.status}`);
  }

  return schema.parse(await response.json());
}

export const cartolaClient = {
  getMarketStatus: () =>
    requestCartola(CARTOLA_COPA_BASE_URL, "/mercado/status", cartolaMarketStatusSchema),
  getFixtures: () =>
    requestCartola(CARTOLA_COPA_BASE_URL, "/partidas", cartolaFixturesSchema),
  getAthletesMarket: () =>
    requestCartola(
      CARTOLA_COPA_BASE_URL,
      "/atletas/mercado",
      cartolaAthletesMarketSchema
    ),
  getAthletesScored: () =>
    requestCartola(
      CARTOLA_COPA_BASE_URL,
      "/atletas/pontuados",
      cartolaAthletesScoredSchema
    ),
  getTeamById: (teamId: number, roundNumber?: number) =>
    requestCartola(
      CARTOLA_COPA_BASE_URL,
      roundNumber ? `/time/id/${teamId}/${roundNumber}` : `/time/id/${teamId}`,
      cartolaLineupSchema
    ),
  searchTeams: (query: string) =>
    requestCartola(
      CARTOLA_COPA_BASE_URL,
      `/times?q=${encodeURIComponent(query)}`,
      cartolaTeamSearchSchema
    )
};
