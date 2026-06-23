import type {
  CartolaFixturesPayload,
  CartolaAthletesMarketPayload,
  CartolaAthletesScoredPayload,
  CartolaLineupPayload
} from "@/lib/cartola/mappers";

type AthleteCatalogEntry = {
  clubId: number;
  positionId: number;
  name: string;
  photo: string | null;
};

export type NormalizedPlayer = {
  athleteId: number;
  playerName: string;
  photoUrl: string | null;
  clubName: string | null;
  positionName: string | null;
  positionId: number;
  points: number;
  entered: boolean;
  matchStarted: boolean;
  source: "starter" | "reserve";
};

export type NormalizedLineup = {
  roundNumber: number;
  totalPoints: number;
  captainId: number | null;
  reserveLuxuryId: number | null;
  starters: NormalizedPlayer[];
  reserves: NormalizedPlayer[];
  effectivePlayers: NormalizedPlayer[];
};

type AthletePartialEntry = {
  entered: boolean;
  points: number;
};

function normalizeCartolaPhotoUrl(photoUrl: string | null | undefined) {
  if (!photoUrl) {
    return null;
  }

  return photoUrl.replace("FORMATO", "220x220");
}

export function buildAthletePartialIndex(
  payload: CartolaAthletesScoredPayload | null
) {
  return new Map<number, AthletePartialEntry>(
    Object.entries(payload?.atletas ?? {}).map(([athleteId, athlete]) => [
      Number(athleteId),
      {
        entered: athlete.entrou_em_campo,
        points: athlete.pontuacao
      }
    ])
  );
}

export function buildStartedClubIds(
  fixtures: CartolaFixturesPayload | null
) {
  if (!fixtures) {
    return new Set<number>();
  }

  const now = Date.now();

  return new Set<number>(
    fixtures.partidas.flatMap((fixture) => {
      const kickoffRaw = fixture.timestamp ?? Date.parse(fixture.partida_data);
      const kickoffMs =
        typeof kickoffRaw === "number" && kickoffRaw < 1_000_000_000_000
          ? kickoffRaw * 1000
          : kickoffRaw;
      const hasStarted = Number.isFinite(kickoffMs) && kickoffMs <= now;

      if (!hasStarted) {
        return [];
      }

      return [fixture.clube_casa_id, fixture.clube_visitante_id];
    })
  );
}

export function resolveEffectivePlayers(
  starters: NormalizedPlayer[],
  reserves: NormalizedPlayer[],
  reserveLuxuryId: number | null
) {
  const effectivePlayers = starters
    .filter((player) => player.entered)
    .map((player) => ({ ...player }));
  const unusedReserves = reserves.map((player) => ({ ...player }));

  for (const starter of starters.filter((player) => !player.entered && player.matchStarted)) {
    const reserveIndex = unusedReserves.findIndex(
      (reserve) =>
        reserve.athleteId !== reserveLuxuryId &&
        reserve.entered &&
        reserve.points > 0 &&
        reserve.positionId === starter.positionId
    );

    if (reserveIndex >= 0) {
      effectivePlayers.push(unusedReserves[reserveIndex]!);
      unusedReserves.splice(reserveIndex, 1);
    }
  }

  if (reserveLuxuryId !== null) {
    const luxuryReserve = unusedReserves.find((reserve) => reserve.athleteId === reserveLuxuryId);

    if (luxuryReserve && luxuryReserve.entered && luxuryReserve.points > 0) {
      const luxuryTargetIndex = effectivePlayers.reduce<number>((lowestIndex, player, index) => {
        if (player.source !== "starter" || player.positionId !== luxuryReserve.positionId) {
          return lowestIndex;
        }

        if (lowestIndex === -1 || player.points < effectivePlayers[lowestIndex]!.points) {
          return index;
        }

        return lowestIndex;
      }, -1);

      if (
        luxuryTargetIndex >= 0 &&
        luxuryReserve.points > effectivePlayers[luxuryTargetIndex]!.points
      ) {
        effectivePlayers.splice(luxuryTargetIndex, 1, luxuryReserve);
      }
    }
  }

  return effectivePlayers;
}

export function buildOfficialLineupSnapshot({
  roundNumber,
  lineup,
  athleteCatalog,
  market
}: {
  roundNumber: number;
  lineup: CartolaLineupPayload;
  athleteCatalog: Map<number, AthleteCatalogEntry>;
  market: CartolaAthletesMarketPayload | null;
}): NormalizedLineup {
  const starters = lineup.atletas.map((player) =>
    mapOfficialPlayer(player, athleteCatalog, market, "starter")
  );
  const reserves = lineup.reservas.map((player) =>
    mapOfficialPlayer(player, athleteCatalog, market, "reserve")
  );
  const effectivePlayers = resolveEffectivePlayers(
    starters,
    reserves,
    lineup.reserva_luxo_id ?? null
  );

  return {
    roundNumber,
    totalPoints: typeof lineup.pontos === "number" ? lineup.pontos : 0,
    captainId: lineup.capitao_id ?? null,
    reserveLuxuryId: lineup.reserva_luxo_id ?? null,
    starters,
    reserves,
    effectivePlayers
  };
}

export function buildPartialLineupSnapshot({
  roundNumber,
  lineup,
  athleteCatalog,
  market,
  partialIndex,
  startedClubIds
}: {
  roundNumber: number;
  lineup: CartolaLineupPayload;
  athleteCatalog: Map<number, AthleteCatalogEntry>;
  market: CartolaAthletesMarketPayload | null;
  partialIndex: Map<number, AthletePartialEntry>;
  startedClubIds: Set<number>;
}): NormalizedLineup {
  const starters = lineup.atletas.map((player) =>
    mapPartialPlayer(player, athleteCatalog, market, partialIndex, startedClubIds, "starter")
  );
  const reserves = lineup.reservas.map((player) =>
    mapPartialPlayer(player, athleteCatalog, market, partialIndex, startedClubIds, "reserve")
  );
  const effectivePlayers = resolveEffectivePlayers(
    starters,
    reserves,
    lineup.reserva_luxo_id ?? null
  );
  const captainId = lineup.capitao_id ?? null;

  const totalPoints = effectivePlayers.reduce((total, player) => {
    const multiplier = player.source === "starter" && player.athleteId === captainId ? 1.5 : 1;
    return total + player.points * multiplier;
  }, 0);

  return {
    roundNumber,
    totalPoints: Number(totalPoints.toFixed(2)),
    captainId,
    reserveLuxuryId: lineup.reserva_luxo_id ?? null,
    starters,
    reserves,
    effectivePlayers
  };
}

function mapOfficialPlayer(
  player: {
    atleta_id: number;
    apelido: string;
    pontos_num?: number | null;
    posicao_id: number;
    clube_id: number;
    entrou_em_campo?: boolean | null;
  },
  athleteCatalog: Map<number, AthleteCatalogEntry>,
  market: CartolaAthletesMarketPayload | null,
  source: "starter" | "reserve"
): NormalizedPlayer {
  const catalogEntry = athleteCatalog.get(player.atleta_id);

  return {
    athleteId: player.atleta_id,
    playerName: player.apelido ?? catalogEntry?.name ?? "",
    photoUrl: normalizeCartolaPhotoUrl(catalogEntry?.photo ?? null),
    clubName: resolveClubName(catalogEntry?.clubId ?? player.clube_id, market),
    positionName: resolvePositionName(catalogEntry?.positionId ?? player.posicao_id, market),
    positionId: player.posicao_id,
    points: typeof player.pontos_num === "number" ? player.pontos_num : 0,
    entered: player.entrou_em_campo !== false,
    matchStarted: true,
    source
  };
}

function mapPartialPlayer(
  player: {
    atleta_id: number;
    apelido: string;
    posicao_id: number;
    clube_id: number;
    entrou_em_campo?: boolean | null;
  },
  athleteCatalog: Map<number, AthleteCatalogEntry>,
  market: CartolaAthletesMarketPayload | null,
  partialIndex: Map<number, AthletePartialEntry>,
  startedClubIds: Set<number>,
  source: "starter" | "reserve"
): NormalizedPlayer {
  const catalogEntry = athleteCatalog.get(player.atleta_id);
  const partial = partialIndex.get(player.atleta_id);
  const clubId = catalogEntry?.clubId ?? player.clube_id;

  return {
    athleteId: player.atleta_id,
    playerName: player.apelido ?? catalogEntry?.name ?? "",
    photoUrl: normalizeCartolaPhotoUrl(catalogEntry?.photo ?? null),
    clubName: resolveClubName(clubId, market),
    positionName: resolvePositionName(catalogEntry?.positionId ?? player.posicao_id, market),
    positionId: player.posicao_id,
    points: partial?.points ?? 0,
    entered: partial !== undefined,
    matchStarted: startedClubIds.has(clubId),
    source
  };
}

function resolveClubName(
  clubId: number,
  market: CartolaAthletesMarketPayload | null
) {
  return market?.clubes[String(clubId)]?.nome ?? null;
}

function resolvePositionName(
  positionId: number,
  market: CartolaAthletesMarketPayload | null
) {
  return market?.posicoes[String(positionId)]?.nome ?? null;
}
