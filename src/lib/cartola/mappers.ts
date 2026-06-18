import type { z } from "zod";
import {
  cartolaAthletesMarketSchema,
  cartolaMarketStatusSchema,
  cartolaAthletesScoredSchema,
  cartolaFixturesSchema,
  cartolaLineupSchema,
  cartolaTeamSearchSchema
} from "@/lib/cartola/schemas";

export type CartolaTeamSearch = z.infer<typeof cartolaTeamSearchSchema>;
export type CartolaFixturesPayload = z.infer<typeof cartolaFixturesSchema>;
export type CartolaAthletesMarketPayload = z.infer<typeof cartolaAthletesMarketSchema>;
export type CartolaMarketStatusPayload = z.infer<typeof cartolaMarketStatusSchema>;
export type CartolaAthletesScoredPayload = z.infer<typeof cartolaAthletesScoredSchema>;
export type CartolaLineupPayload = z.infer<typeof cartolaLineupSchema>;

export function mapAthleteScoreIndex(payload: CartolaAthletesScoredPayload) {
  return new Map(
    Object.entries(payload.atletas).map(([athleteId, athlete]) => [Number(athleteId), athlete.pontuacao])
  );
}

export function mapAthleteCatalog(payload: CartolaAthletesMarketPayload) {
  return new Map(
    payload.atletas.map((athlete) => [
      athlete.atleta_id,
      {
        athleteId: athlete.atleta_id,
        clubId: athlete.clube_id,
        positionId: athlete.posicao_id,
        name: athlete.nome,
        shortName: athlete.apelido,
        photo: athlete.foto ?? null
      }
    ])
  );
}
