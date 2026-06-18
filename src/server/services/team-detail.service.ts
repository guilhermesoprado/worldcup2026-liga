import { participants } from "@/domain/participants/static-league-data";
import { cartolaClient } from "@/lib/cartola/client";
import { mapAthleteCatalog } from "@/lib/cartola/mappers";
import type { CartolaLineupPayload } from "@/lib/cartola/mappers";
import type { PublicLineupPlayer, PublicTeamDetail } from "@/types/public";

export class TeamDetailService {
  async getTeamDetail(teamId: string, roundId?: string | null) {
    const participant = participants.find((item) => item.id === teamId);

    if (!participant) {
      return {
        teamId,
        lineup: []
      };
    }

    const [marketStatus, market] = await Promise.all([
      cartolaClient.getMarketStatus(),
      cartolaClient.getAthletesMarket().catch(() => null)
    ]);
    const athleteCatalog = market
      ? mapAthleteCatalog(market)
      : new Map<number, { name: string; clubId: number; positionId: number }>();
    const officialRoundNumber = await this.getOfficialRoundNumber(
      participant.cartolaTeamId,
      marketStatus.rodada_atual
    );
    const selectedRoundNumber = this.resolveSelectedRoundNumber({
      roundId,
      currentRoundNumber: marketStatus.rodada_atual,
      officialRoundNumber,
      isLiveRound: marketStatus.bola_rolando
    });
    const lineup = await cartolaClient.getTeamById(
      participant.cartolaTeamId,
      selectedRoundNumber
    );
    const state =
      selectedRoundNumber === marketStatus.rodada_atual && marketStatus.bola_rolando
        ? "partial"
        : "official";
    const starters = lineup.atletas.map((player) =>
      this.mapPlayer(player, "starter", athleteCatalog, market)
    );
    const reserves = lineup.reservas.map((player) =>
      this.mapPlayer(player, "reserve", athleteCatalog, market)
    );
    const effectivePlayers = this.resolveEffectivePlayers(starters, reserves);

    const detail: PublicTeamDetail = {
      participantId: participant.id,
      owner: participant.owner,
      country: participant.country,
      cartolaTeamName: participant.cartolaTeamName,
      roundNumber: selectedRoundNumber,
      roundLabel: `${selectedRoundNumber}a rodada`,
      state,
      totalPoints: Number((lineup.pontos ?? 0).toFixed(2)),
      starters: this.sortPlayersByPosition(starters),
      reserves: this.sortPlayersByPosition(reserves),
      effectivePlayers: this.sortPlayersByPosition(effectivePlayers),
      captainId: lineup.capitao_id ?? null,
      reserveLuxuryId: lineup.reserva_luxo_id ?? null,
      usesLiveData: true
    };

    return detail;
  }

  private async getOfficialRoundNumber(teamId: number, currentRoundNumber: number) {
    for (let roundNumber = currentRoundNumber; roundNumber >= 1; roundNumber -= 1) {
      try {
        const lineup = await cartolaClient.getTeamById(teamId, roundNumber);
        const detectedRound = this.detectLineupRound(lineup);

        if (detectedRound === roundNumber) {
          return roundNumber;
        }
      } catch {
        // ignore and continue searching previous round
      }
    }

    return 1;
  }

  private detectLineupRound(lineup: CartolaLineupPayload) {
    const players = [...lineup.atletas, ...lineup.reservas];
    const rounds = [...new Set(players.map((player) => player.rodada_id).filter(
      (roundId): roundId is number => typeof roundId === "number"
    ))];

    return rounds.length === 1 ? rounds[0] : null;
  }

  private resolveSelectedRoundNumber({
    roundId,
    currentRoundNumber,
    officialRoundNumber,
    isLiveRound
  }: {
    roundId?: string | null;
    currentRoundNumber: number;
    officialRoundNumber: number;
    isLiveRound: boolean;
  }) {
    const parsedRound = Number(roundId);

    if (Number.isInteger(parsedRound) && parsedRound > 0) {
      return parsedRound;
    }

    if (isLiveRound) {
      return currentRoundNumber;
    }

    return officialRoundNumber;
  }

  private mapPlayer(
    player: {
      atleta_id: number;
      apelido: string;
      pontos_num?: number | null;
      posicao_id: number;
      clube_id: number;
      entrou_em_campo?: boolean | null;
    },
    source: "starter" | "reserve",
    athleteCatalog: Map<number, { name: string; clubId: number; positionId: number }>,
    market:
      | {
          clubes: Record<string, { id: number; nome: string }>;
          posicoes: Record<string, { id: number; nome: string; abreviacao: string }>;
        }
      | null
  ): PublicLineupPlayer {
    const catalogEntry = athleteCatalog.get(player.atleta_id);

    return {
      athleteId: player.atleta_id,
      playerName: catalogEntry?.name ?? player.apelido,
      clubName:
        (catalogEntry
          ? market?.clubes[String(catalogEntry.clubId)]?.nome
          : market?.clubes[String(player.clube_id)]?.nome) ?? "Sem clube",
      positionName:
        (catalogEntry
          ? market?.posicoes[String(catalogEntry.positionId)]?.nome
          : market?.posicoes[String(player.posicao_id)]?.nome) ?? "Sem posicao",
      points: typeof player.pontos_num === "number" ? Number(player.pontos_num.toFixed(2)) : null,
      entered: player.entrou_em_campo !== false,
      source,
      counted: false
    };
  }

  private resolveEffectivePlayers(
    starters: PublicLineupPlayer[],
    reserves: PublicLineupPlayer[]
  ) {
    const countedStarters = starters.map((player) =>
      player.entered ? { ...player, counted: true } : { ...player }
    );
    const countedReserves = reserves.map((player) => ({ ...player }));
    const effectivePlayers = countedStarters.filter((player) => player.counted);

    for (const starter of countedStarters.filter((player) => !player.entered)) {
      const reserveIndex = countedReserves.findIndex(
        (reserve) =>
          reserve.entered &&
          !reserve.counted &&
          reserve.positionName === starter.positionName
      );

      if (reserveIndex >= 0) {
        countedReserves[reserveIndex] = {
          ...countedReserves[reserveIndex]!,
          counted: true
        };
        effectivePlayers.push(countedReserves[reserveIndex]!);
      }
    }

    starters.splice(0, starters.length, ...countedStarters);
    reserves.splice(0, reserves.length, ...countedReserves);

    return effectivePlayers;
  }

  private sortPlayersByPosition(players: PublicLineupPlayer[]) {
    const order = new Map<string, number>([
      ["goleiro", 0],
      ["lateral", 1],
      ["zagueiro", 2],
      ["meia", 3],
      ["meio-campo", 3],
      ["atacante", 4],
      ["tecnico", 5],
      ["técnico", 5]
    ]);

    return [...players].sort((left, right) => {
      const leftOrder = order.get(left.positionName.toLowerCase()) ?? 99;
      const rightOrder = order.get(right.positionName.toLowerCase()) ?? 99;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.playerName.localeCompare(right.playerName);
    });
  }
}
