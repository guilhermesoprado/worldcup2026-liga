import type {
  CartolaAthletesMarketPayload,
  CartolaAthletesScoredPayload,
  CartolaLineupPayload
} from "@/lib/cartola/mappers";

type AthleteCatalogEntry = {
  clubId: number;
  positionId: number;
  name: string;
};

export type NormalizedPlayer = {
  athleteId: number;
  playerName: string;
  clubName: string | null;
  positionName: string | null;
  positionId: number;
  points: number;
  entered: boolean;
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

export function resolveEffectivePlayers(
  starters: NormalizedPlayer[],
  reserves: NormalizedPlayer[]
) {
  const effectivePlayers = starters
    .filter((player) => player.entered)
    .map((player) => ({ ...player }));
  const unusedReserves = reserves.map((player) => ({ ...player }));

  for (const starter of starters.filter((player) => !player.entered)) {
    const reserveIndex = unusedReserves.findIndex(
      (reserve) => reserve.entered && reserve.positionId === starter.positionId
    );

    if (reserveIndex >= 0) {
      effectivePlayers.push(unusedReserves[reserveIndex]!);
      unusedReserves.splice(reserveIndex, 1);
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
  const effectivePlayers = resolveEffectivePlayers(starters, reserves);

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
  partialIndex
}: {
  roundNumber: number;
  lineup: CartolaLineupPayload;
  athleteCatalog: Map<number, AthleteCatalogEntry>;
  market: CartolaAthletesMarketPayload | null;
  partialIndex: Map<number, AthletePartialEntry>;
}): NormalizedLineup {
  const starters = lineup.atletas.map((player) =>
    mapPartialPlayer(player, athleteCatalog, market, partialIndex, "starter")
  );
  const reserves = lineup.reservas.map((player) =>
    mapPartialPlayer(player, athleteCatalog, market, partialIndex, "reserve")
  );
  const effectivePlayers = resolveEffectivePlayers(starters, reserves);
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
    playerName: catalogEntry?.name ?? player.apelido,
    clubName: resolveClubName(catalogEntry?.clubId ?? player.clube_id, market),
    positionName: resolvePositionName(catalogEntry?.positionId ?? player.posicao_id, market),
    positionId: player.posicao_id,
    points: typeof player.pontos_num === "number" ? player.pontos_num : 0,
    entered: player.entrou_em_campo !== false,
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
  source: "starter" | "reserve"
): NormalizedPlayer {
  const catalogEntry = athleteCatalog.get(player.atleta_id);
  const partial = partialIndex.get(player.atleta_id);

  return {
    athleteId: player.atleta_id,
    playerName: catalogEntry?.name ?? player.apelido,
    clubName: resolveClubName(catalogEntry?.clubId ?? player.clube_id, market),
    positionName: resolvePositionName(catalogEntry?.positionId ?? player.posicao_id, market),
    positionId: player.posicao_id,
    points: partial?.points ?? 0,
    entered: partial?.entered ?? player.entrou_em_campo === true,
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
