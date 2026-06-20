import { participants } from "@/domain/participants/static-league-data";
import {
  buildAthletePartialIndex,
  buildOfficialLineupSnapshot,
  buildPartialLineupSnapshot
} from "@/domain/sync/lineup-score";
import { formatRoundLabel, resolveMarketState } from "@/domain/sync/market-state";
import { cartolaClient } from "@/lib/cartola/client";
import { mapAthleteCatalog } from "@/lib/cartola/mappers";
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

    const [marketStatus, market, athletesScored] = await Promise.all([
      cartolaClient.getMarketStatus(),
      cartolaClient.getAthletesMarket().catch(() => null),
      cartolaClient.getAthletesScored().catch(() => null)
    ]);
    const marketState = resolveMarketState(marketStatus);
    const athleteCatalog = market
      ? mapAthleteCatalog(market)
      : new Map<number, { name: string; clubId: number; positionId: number }>();
    const selectedRoundNumber = this.resolveSelectedRoundNumber({
      roundId,
      displayRoundNumber: marketState.displayRoundNumber
    });
    const lineup = await cartolaClient.getTeamById(participant.cartolaTeamId, selectedRoundNumber);
    const partialIndex = buildAthletePartialIndex(athletesScored);
    const normalized =
      marketState.partialRoundNumber === selectedRoundNumber
        ? buildPartialLineupSnapshot({
            roundNumber: selectedRoundNumber,
            lineup,
            athleteCatalog,
            market,
            partialIndex
          })
        : buildOfficialLineupSnapshot({
            roundNumber: selectedRoundNumber,
            lineup,
            athleteCatalog,
            market
          });

    const effectiveKeys = new Set(
      normalized.effectivePlayers.map((player) => `${player.source}:${player.athleteId}`)
    );
    const starters = normalized.starters.map((player) =>
      this.mapPlayer(player, effectiveKeys)
    );
    const reserves = normalized.reserves.map((player) =>
      this.mapPlayer(player, effectiveKeys)
    );
    const effectivePlayers = [...starters, ...reserves]
      .filter((player) => effectiveKeys.has(`${player.source}:${player.athleteId}`))
      .map((player) => ({ ...player, counted: true }));

    const detail: PublicTeamDetail = {
      participantId: participant.id,
      owner: participant.owner,
      country: participant.country,
      cartolaTeamName: participant.cartolaTeamName,
      roundNumber: selectedRoundNumber,
      roundLabel: formatRoundLabel(selectedRoundNumber),
      state: marketState.partialRoundNumber === selectedRoundNumber ? "partial" : "official",
      totalPoints: Number(normalized.totalPoints.toFixed(2)),
      starters: this.sortPlayersByPosition(starters),
      reserves: this.sortPlayersByPosition(reserves),
      effectivePlayers: this.sortPlayersByPosition(effectivePlayers),
      captainId: normalized.captainId,
      reserveLuxuryId: normalized.reserveLuxuryId,
      usesLiveData: true
    };

    return detail;
  }

  private resolveSelectedRoundNumber({
    roundId,
    displayRoundNumber
  }: {
    roundId?: string | null;
    displayRoundNumber: number;
  }) {
    const parsedRound = Number(roundId);

    if (Number.isInteger(parsedRound) && parsedRound > 0) {
      return parsedRound;
    }

    return displayRoundNumber;
  }

  private mapPlayer(
    player: {
      athleteId: number;
      playerName: string;
      clubName: string | null;
      positionName: string | null;
      points: number;
      entered: boolean;
      source: "starter" | "reserve";
    },
    effectiveKeys: Set<string>
  ): PublicLineupPlayer {
    return {
      athleteId: player.athleteId,
      playerName: player.playerName,
      clubName: player.clubName ?? "Sem clube",
      positionName: player.positionName ?? "Sem posicao",
      points: Number(player.points.toFixed(2)),
      entered: player.entered,
      source: player.source,
      counted: effectiveKeys.has(`${player.source}:${player.athleteId}`)
    };
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
