import { participants } from "@/domain/participants/static-league-data";
import {
  buildAthletePartialIndex,
  buildOfficialLineupSnapshot,
  buildPartialLineupSnapshot
} from "@/domain/sync/lineup-score";
import { formatRoundLabel, resolveMarketState } from "@/domain/sync/market-state";
import { cartolaClient } from "@/lib/cartola/client";
import { mapAthleteCatalog } from "@/lib/cartola/mappers";
import { LineupSnapshotRepository } from "@/server/repositories/lineup-snapshot.repository";
import { ParticipantRepository } from "@/server/repositories/participant.repository";
import { RoundRepository } from "@/server/repositories/round.repository";
import type { PublicLineupPlayer, PublicTeamDetail } from "@/types/public";

export class TeamDetailService {
  private readonly roundRepository = new RoundRepository();
  private readonly participantRepository = new ParticipantRepository();
  private readonly lineupSnapshotRepository = new LineupSnapshotRepository();

  async getTeamDetail(teamId: string, roundId?: string | null) {
    const participant = participants.find((item) => item.id === teamId);

    if (!participant) {
      return {
        teamId,
        lineup: []
      };
    }

    const selectedRoundNumber = await this.resolveSelectedRoundNumber(roundId);
    const persistedDetail = await this.getPersistedTeamDetail(teamId, selectedRoundNumber);

    if (persistedDetail) {
      return persistedDetail;
    }

    return this.getFallbackLiveTeamDetail(participant, selectedRoundNumber);
  }

  private async resolveSelectedRoundNumber(roundId?: string | null) {
    const parsedRound = Number(roundId);

    if (Number.isInteger(parsedRound) && parsedRound > 0) {
      return parsedRound;
    }

    const rounds = await this.roundRepository.listAll();
    const liveRound = rounds.find((round) => round.status === "live");

    if (liveRound) {
      return liveRound.external_round_id;
    }

    const officialRound = [...rounds]
      .filter((round) => round.status === "official")
      .sort((left, right) => right.external_round_id - left.external_round_id)[0];

    return officialRound?.external_round_id ?? 1;
  }

  private async getPersistedTeamDetail(teamId: string, roundNumber: number) {
    const [round, participantRecord] = await Promise.all([
      this.roundRepository.getByExternalRoundId(roundNumber),
      this.participantRepository.getById(teamId)
    ]);

    if (!round || !participantRecord) {
      return null;
    }

    const lineupWithPlayers = await this.lineupSnapshotRepository.getByRoundAndParticipant(
      round.id,
      participantRecord.id
    );

    if (!lineupWithPlayers) {
      return null;
    }

    const players = lineupWithPlayers.players;
    const starters = this.sortPlayersByPosition(
      players
        .filter((player) => player.source === "starter")
        .map((player) => this.mapPersistedPlayer(player))
    );
    const reserves = this.sortPlayersByPosition(
      players
        .filter((player) => player.source === "reserve")
        .map((player) => this.mapPersistedPlayer(player))
    );
    const effectivePlayers = this.sortPlayersByPosition(
      players.filter((player) => player.counted).map((player) => this.mapPersistedPlayer(player))
    );

    const participant = participants.find((item) => item.id === teamId)!;

    const detail: PublicTeamDetail = {
      participantId: participant.id,
      owner: participant.owner,
      country: participant.country,
      cartolaTeamName: participant.cartolaTeamName,
      roundNumber,
      roundLabel: formatRoundLabel(roundNumber),
      state: lineupWithPlayers.snapshot.state === "partial" ? "partial" : "official",
      totalPoints: Number(lineupWithPlayers.snapshot.total_points),
      starters,
      reserves,
      effectivePlayers,
      captainId: lineupWithPlayers.snapshot.captain_id ?? null,
      reserveLuxuryId: lineupWithPlayers.snapshot.reserve_luxury_id ?? null,
      usesLiveData: false
    };

    return detail;
  }

  private async getFallbackLiveTeamDetail(
    participant: (typeof participants)[number],
    selectedRoundNumber: number
  ) {
    const [marketStatus, market, athletesScored] = await Promise.all([
      cartolaClient.getMarketStatus(),
      cartolaClient.getAthletesMarket().catch(() => null),
      cartolaClient.getAthletesScored().catch(() => null)
    ]);
    const marketState = resolveMarketState(marketStatus);
    const athleteCatalog = market
      ? mapAthleteCatalog(market)
      : new Map<number, { name: string; clubId: number; positionId: number }>();
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
    const starters = this.sortPlayersByPosition(
      normalized.starters.map((player) => this.mapLivePlayer(player, effectiveKeys))
    );
    const reserves = this.sortPlayersByPosition(
      normalized.reserves.map((player) => this.mapLivePlayer(player, effectiveKeys))
    );
    const effectivePlayers = this.sortPlayersByPosition(
      [...starters, ...reserves]
        .filter((player) => effectiveKeys.has(`${player.source}:${player.athleteId}`))
        .map((player) => ({ ...player, counted: true }))
    );

    const detail: PublicTeamDetail = {
      participantId: participant.id,
      owner: participant.owner,
      country: participant.country,
      cartolaTeamName: participant.cartolaTeamName,
      roundNumber: selectedRoundNumber,
      roundLabel: formatRoundLabel(selectedRoundNumber),
      state: marketState.partialRoundNumber === selectedRoundNumber ? "partial" : "official",
      totalPoints: Number(normalized.totalPoints.toFixed(2)),
      starters,
      reserves,
      effectivePlayers,
      captainId: normalized.captainId,
      reserveLuxuryId: normalized.reserveLuxuryId,
      usesLiveData: true
    };

    return detail;
  }

  private mapPersistedPlayer(player: {
    athlete_id: number | null;
    player_name: string;
    club_name: string | null;
    position_name: string | null;
    points: number;
    entered: boolean;
    source: string;
    counted: boolean;
  }): PublicLineupPlayer {
    return {
      athleteId: player.athlete_id ?? 0,
      playerName: player.player_name,
      clubName: player.club_name ?? "Sem clube",
      positionName: player.position_name ?? "Sem posicao",
      points: Number(player.points),
      entered: player.entered,
      source: player.source === "reserve" ? "reserve" : "starter",
      counted: player.counted
    };
  }

  private mapLivePlayer(
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
