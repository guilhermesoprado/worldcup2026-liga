import { participants } from "@/domain/participants/static-league-data";
import { formatRoundLabel } from "@/domain/sync/market-state";
import { LineupSnapshotRepository } from "@/server/repositories/lineup-snapshot.repository";
import { ParticipantRepository } from "@/server/repositories/participant.repository";
import { RoundRepository } from "@/server/repositories/round.repository";
import { PublicReadinessService } from "@/server/services/public-readiness.service";
import type { PublicLineupPlayer, PublicTeamDetail } from "@/types/public";

function normalizeCartolaPhotoUrl(photoUrl: string | null | undefined) {
  if (!photoUrl) {
    return null;
  }

  return photoUrl.replace("FORMATO", "220x220");
}

export class TeamDetailService {
  private readonly roundRepository = new RoundRepository();
  private readonly participantRepository = new ParticipantRepository();
  private readonly lineupSnapshotRepository = new LineupSnapshotRepository();
  private readonly publicReadinessService = new PublicReadinessService();

  async getTeamDetail(teamId: string, roundId?: string | null) {
    const participant = participants.find((item) => item.id === teamId);

    if (!participant) {
      return {
        teamId,
        lineup: []
      };
    }

    await this.publicReadinessService.ensurePublicDataReady();

    const selectedRoundNumber = await this.resolveSelectedRoundNumberSafely(roundId);
    const persistedDetail = await this.getPersistedTeamDetailSafely(teamId, selectedRoundNumber);

    if (persistedDetail) {
      return persistedDetail;
    }

    const persistedRound = await this.getRoundSafely(selectedRoundNumber);

    return {
      participantId: participant.id,
      owner: participant.owner,
      country: participant.country,
      cartolaTeamName: participant.cartolaTeamName,
      roundNumber: selectedRoundNumber,
      roundLabel: formatRoundLabel(selectedRoundNumber),
      state: persistedRound?.status === "live" ? ("partial" as const) : ("official" as const),
      totalPoints: 0,
      starters: [],
      reserves: [],
      effectivePlayers: [],
      captainId: null,
      reserveLuxuryId: null,
      usesLiveData: false
    };
  }

  private async resolveSelectedRoundNumberSafely(roundId?: string | null) {
    try {
      return await this.resolveSelectedRoundNumber(roundId);
    } catch {
      const parsedRound = Number(roundId);

      if (Number.isInteger(parsedRound) && parsedRound > 0) {
        return parsedRound;
      }

      return 1;
    }
  }

  private async getPersistedTeamDetailSafely(teamId: string, roundNumber: number) {
    try {
      return await this.getPersistedTeamDetail(teamId, roundNumber);
    } catch {
      return null;
    }
  }

  private async getRoundSafely(roundNumber: number) {
    try {
      return await this.roundRepository.getByExternalRoundId(roundNumber);
    } catch {
      return null;
    }
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
    const participant = participants.find((item) => item.id === teamId);

    if (!participant) {
      return null;
    }

    const [round, participantRecord] = await Promise.all([
      this.roundRepository.getByExternalRoundId(roundNumber),
      this.participantRepository.getByCartolaTeamId(participant.cartolaTeamId)
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
    const starters = players
      .filter((player) => player.source === "starter")
      .map((player) => this.mapPersistedPlayer(player));
    const reserves = players
      .filter((player) => player.source === "reserve")
      .map((player) => this.mapPersistedPlayer(player));
    const effectivePlayers = this.sortPlayersByPosition(
      players.filter((player) => player.counted).map((player) => this.mapPersistedPlayer(player))
    );

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

  private mapPersistedPlayer(player: {
    athlete_id: number | null;
    player_name: string;
    photo_url?: string | null;
    club_name: string | null;
    position_name: string | null;
    points: number;
    entered: boolean;
    status_label?: string | null;
    source: string;
    counted: boolean;
  }): PublicLineupPlayer {
    return {
      athleteId: player.athlete_id ?? 0,
      playerName: player.player_name,
      photoUrl: normalizeCartolaPhotoUrl(player.photo_url ?? null),
      clubName: player.club_name ?? "Sem clube",
      positionName: player.position_name ?? "Sem posicao",
      points: Number(player.points),
      entered: player.entered,
      matchStarted: !String(player.status_label ?? "").includes("waiting"),
      source: player.source === "reserve" ? "reserve" : "starter",
      counted: player.counted
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
