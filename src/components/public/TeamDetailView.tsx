"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FlagBadge } from "@/components/public/FlagBadge";
import type { PublicLineupPlayer, PublicTeamDetail } from "@/types/public";

type Props = {
  detail: PublicTeamDetail;
  view: "field" | "list";
};

type PositionKey = "GOL" | "LAT" | "ZAG" | "MEI" | "ATA" | "TEC";

type FormationLayout = {
  attack: Array<{ x: number; y: number }>;
  midfield: Array<{ x: number; y: number }>;
  defense: Array<{ x: number; y: number }>;
  goalkeeper: Array<{ x: number; y: number }>;
  coach: Array<{ x: number; y: number }>;
};

type ReplacementMap = {
  starterToReserve: Map<number, PublicLineupPlayer>;
  reserveToStarter: Map<number, PublicLineupPlayer>;
};

const POSITION_ORDER: Record<PositionKey, number> = {
  GOL: 0,
  LAT: 1,
  ZAG: 2,
  MEI: 3,
  ATA: 4,
  TEC: 5
};

function normalizePosition(positionName: string) {
  const normalized = positionName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (normalized.includes("goleiro")) return "GOL" as const;
  if (normalized.includes("lateral")) return "LAT" as const;
  if (normalized.includes("zagueiro")) return "ZAG" as const;
  if (normalized.includes("meia") || normalized.includes("meio-campo")) return "MEI" as const;
  if (normalized.includes("atacante")) return "ATA" as const;
  return "TEC" as const;
}

function getPlayerLabel(playerName: string) {
  return playerName.trim() || "Jogador";
}

function formatFormation(starters: PublicLineupPlayer[]) {
  const counts = starters.reduce<Record<PositionKey, number>>(
    (acc, player) => {
      acc[normalizePosition(player.positionName)] += 1;
      return acc;
    },
    { GOL: 0, LAT: 0, ZAG: 0, MEI: 0, ATA: 0, TEC: 0 }
  );

  return `${counts.LAT + counts.ZAG}-${counts.MEI}-${counts.ATA}`;
}

function sortMainPlayers(players: PublicLineupPlayer[]) {
  return [...players].sort((left, right) => {
    const leftKey = normalizePosition(left.positionName);
    const rightKey = normalizePosition(right.positionName);
    const orderDiff = POSITION_ORDER[leftKey] - POSITION_ORDER[rightKey];

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return getPlayerLabel(left.playerName).localeCompare(getPlayerLabel(right.playerName));
  });
}

function sortReservePlayers(players: PublicLineupPlayer[]) {
  return [...players].sort((left, right) => {
    const leftKey = normalizePosition(left.positionName);
    const rightKey = normalizePosition(right.positionName);
    const orderDiff = POSITION_ORDER[leftKey] - POSITION_ORDER[rightKey];

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return getPlayerLabel(left.playerName).localeCompare(getPlayerLabel(right.playerName));
  });
}

function getCoordsForCount(count: number, y: number, minX: number, maxX: number) {
  if (count === 0) return [];
  if (count === 1) return [{ x: 50, y }];
  if (count === 2) return [{ x: 34, y }, { x: 66, y }];

  const step = (maxX - minX) / (count - 1);

  return Array.from({ length: count }, (_, index) => ({
    x: minX + step * index,
    y
  }));
}

function getFormationLayout(formationLabel: string): FormationLayout {
  const layout: FormationLayout = {
    attack: [],
    midfield: [],
    defense: [],
    goalkeeper: [{ x: 50, y: 85 }],
    coach: [{ x: 84, y: 85 }]
  };

  switch (formationLabel) {
    case "3-4-3":
      layout.attack = getCoordsForCount(3, 11, 18, 82);
      layout.midfield = getCoordsForCount(4, 37, 16, 84);
      layout.defense = getCoordsForCount(3, 66, 24, 76);
      break;
    case "3-5-2":
      layout.attack = getCoordsForCount(2, 11, 30, 70);
      layout.midfield = [
        { x: 15, y: 37 },
        { x: 32.5, y: 37 },
        { x: 50, y: 37 },
        { x: 67.5, y: 37 },
        { x: 85, y: 37 }
      ];
      layout.defense = getCoordsForCount(3, 66, 24, 76);
      break;
    case "4-4-2":
      layout.attack = getCoordsForCount(2, 11, 30, 70);
      layout.midfield = getCoordsForCount(4, 37, 16, 84);
      layout.defense = [
        { x: 14, y: 66 },
        { x: 38, y: 66 },
        { x: 62, y: 66 },
        { x: 86, y: 66 }
      ];
      break;
    case "4-5-1":
      layout.attack = [{ x: 50, y: 11 }];
      layout.midfield = [
        { x: 15, y: 37 },
        { x: 32.5, y: 37 },
        { x: 50, y: 37 },
        { x: 67.5, y: 37 },
        { x: 85, y: 37 }
      ];
      layout.defense = [
        { x: 14, y: 66 },
        { x: 38, y: 66 },
        { x: 62, y: 66 },
        { x: 86, y: 66 }
      ];
      break;
    case "5-3-2":
      layout.attack = getCoordsForCount(2, 11, 30, 70);
      layout.midfield = getCoordsForCount(3, 37, 18, 82);
      layout.defense = [
        { x: 10, y: 66 },
        { x: 30, y: 66 },
        { x: 50, y: 64 },
        { x: 70, y: 66 },
        { x: 90, y: 66 }
      ];
      break;
    case "5-4-1":
      layout.attack = [{ x: 50, y: 11 }];
      layout.midfield = getCoordsForCount(4, 37, 16, 84);
      layout.defense = [
        { x: 10, y: 66 },
        { x: 30, y: 66 },
        { x: 50, y: 64 },
        { x: 70, y: 66 },
        { x: 90, y: 66 }
      ];
      break;
    default:
      layout.attack = getCoordsForCount(3, 11, 18, 82);
      layout.midfield = getCoordsForCount(3, 37, 18, 82);
      layout.defense = [
        { x: 14, y: 66 },
        { x: 38, y: 66 },
        { x: 62, y: 66 },
        { x: 86, y: 66 }
      ];
      break;
  }

  return layout;
}

function buildReplacementMap(detail: PublicTeamDetail): ReplacementMap {
  const starterToReserve = new Map<number, PublicLineupPlayer>();
  const reserveToStarter = new Map<number, PublicLineupPlayer>();

  const luxuryReserve = detail.reserves.find(
    (reserve) => reserve.athleteId === detail.reserveLuxuryId && reserve.counted
  );
  const usedReserveIds = new Set<number>();
  const replacedStarterIds = new Set<number>();

  for (const starter of detail.starters) {
    if (starter.counted || starter.entered || !starter.matchStarted) {
      continue;
    }

    const replacement = detail.reserves.find(
      (reserve) =>
        reserve.athleteId !== detail.reserveLuxuryId &&
        reserve.counted &&
        !usedReserveIds.has(reserve.athleteId) &&
        normalizePosition(reserve.positionName) === normalizePosition(starter.positionName)
    );

    if (!replacement) {
      continue;
    }

    starterToReserve.set(starter.athleteId, replacement);
    reserveToStarter.set(replacement.athleteId, starter);
    replacedStarterIds.add(starter.athleteId);
    usedReserveIds.add(replacement.athleteId);
  }

  if (luxuryReserve) {
    const candidates = detail.starters.filter(
      (starter) =>
        !replacedStarterIds.has(starter.athleteId) &&
        starter.entered &&
        normalizePosition(starter.positionName) === normalizePosition(luxuryReserve.positionName)
    );

    const lowestStarter = [...candidates].sort(
      (left, right) => (left.points ?? 0) - (right.points ?? 0)
    )[0];

    if (lowestStarter && (luxuryReserve.points ?? 0) > (lowestStarter.points ?? 0)) {
      starterToReserve.set(lowestStarter.athleteId, luxuryReserve);
      reserveToStarter.set(luxuryReserve.athleteId, lowestStarter);
    }
  }

  return { starterToReserve, reserveToStarter };
}

function isWaitingForMatch(player: PublicLineupPlayer) {
  return !player.matchStarted && !player.entered;
}

function formatDisplayPoints(player: PublicLineupPlayer) {
  return isWaitingForMatch(player) ? "—" : (player.points ?? 0).toFixed(2);
}

function buildStatusText(
  player: PublicLineupPlayer,
  detail: PublicTeamDetail,
  replacements: ReplacementMap
) {
  if (player.source === "starter") {
    const reserve = replacements.starterToReserve.get(player.athleteId);

    if (reserve) {
      return `Substituído por ${getPlayerLabel(reserve.playerName)}`;
    }

    if (player.counted) {
      return "Em campo";
    }

    if (!player.matchStarted) {
      return "Aguardando jogo ou confirmação";
    }

    return "Jogo aconteceu e não apareceu em pontuados";
  }

  if (player.counted) {
    if (player.athleteId === detail.reserveLuxuryId) {
      return "Entrou como reserva de luxo";
    }

    const starter = replacements.reserveToStarter.get(player.athleteId);
    return starter
      ? `Entrou no lugar de ${getPlayerLabel(starter.playerName)}`
      : "Entrou no lugar de titular";
  }

  if (player.entered) {
    return player.points !== null && player.points > 0
      ? "Não entrou"
      : "Pontuou negativo e não pode entrar";
  }

  if (!player.matchStarted) {
    return "Aguardando jogo";
  }

  return "Jogo aconteceu e não apareceu em pontuados";
}

function buildFieldGroups(starters: PublicLineupPlayer[]) {
  const defensivePlayers = starters.filter((player) => {
    const position = normalizePosition(player.positionName);
    return position === "LAT" || position === "ZAG";
  });
  const fullBacks = defensivePlayers.filter(
    (player) => normalizePosition(player.positionName) === "LAT"
  );
  const centerBacks = defensivePlayers.filter(
    (player) => normalizePosition(player.positionName) === "ZAG"
  );
  const defense =
    fullBacks.length >= 2
      ? [fullBacks[0], ...centerBacks, ...fullBacks.slice(1)]
      : [...fullBacks, ...centerBacks];

  return {
    attack: starters.filter((player) => normalizePosition(player.positionName) === "ATA"),
    midfield: starters.filter((player) => normalizePosition(player.positionName) === "MEI"),
    defense,
    goalkeeper: starters.filter((player) => normalizePosition(player.positionName) === "GOL"),
    coach: starters.filter((player) => normalizePosition(player.positionName) === "TEC")
  };
}

function PlayerAvatar({
  player,
  className
}: {
  player: PublicLineupPlayer;
  className: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (player.photoUrl && !imageFailed) {
    return (
      <img
        className={className}
        src={player.photoUrl}
        alt={getPlayerLabel(player.playerName)}
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className={className}>
      {getPlayerLabel(player.playerName)
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </div>
  );
}

function LuxuryMarkerIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="team-detail-marker__icon">
      <path
        d="M5.2 5.1h4.2v1.8H8.1l2.9 2.9-1.3 1.3-2.9-2.9v1.3H5.2V5.1Zm9.6 9.8h-4.2v-1.8h1.3L9 10.2l1.3-1.3 2.9 2.9v-1.3h1.6v4.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ArrowUpMarkerIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="team-detail-marker__icon">
      <path d="M8 3.1 13 8H9.7v4.9H6.3V8H3l5-4.9Z" fill="currentColor" />
    </svg>
  );
}

function ArrowDownMarkerIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="team-detail-marker__icon">
      <path d="M8 12.9 3 8h3.3V3.1h3.4V8H13l-5 4.9Z" fill="currentColor" />
    </svg>
  );
}

function TacticalPlayer({
  player,
  inactive,
  waiting,
  reserveIn,
  reserveOut,
  isCaptain,
  isLuxury
}: {
  player: PublicLineupPlayer;
  inactive: boolean;
  waiting: boolean;
  reserveIn: boolean;
  reserveOut: boolean;
  isCaptain: boolean;
  isLuxury: boolean;
}) {
  return (
    <div
      className={[
        "team-detail-tactical-player",
        inactive ? "team-detail-tactical-player--inactive" : "",
        waiting ? "team-detail-tactical-player--waiting" : "",
        reserveIn ? "team-detail-tactical-player--reserve-in" : "",
        reserveOut ? "team-detail-tactical-player--reserve-out" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="team-detail-avatar-ring">
        <PlayerAvatar player={player} className="team-detail-avatar-face" />
        {isCaptain ? (
          <span className="team-detail-marker team-detail-marker--captain" aria-label="Capitão">
            C
          </span>
        ) : null}
        {isLuxury ? (
          <span
            className="team-detail-marker team-detail-marker--luxury"
            aria-label="Reserva de luxo"
          >
            <LuxuryMarkerIcon />
          </span>
        ) : null}
        {reserveIn ? (
          <span className="team-detail-marker team-detail-marker--up" aria-label="Entrou">
            <ArrowUpMarkerIcon />
          </span>
        ) : null}
        {reserveOut ? (
          <span className="team-detail-marker team-detail-marker--down" aria-label="Saiu">
            <ArrowDownMarkerIcon />
          </span>
        ) : null}
      </div>
      <div className="team-detail-name-plate">{getPlayerLabel(player.playerName)}</div>
      <div
        className={[
          "team-detail-point-pill",
          waiting ? "team-detail-point-pill--pending" : "",
          player.points !== null && player.points < 0 ? "team-detail-point-pill--negative" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {formatDisplayPoints(player)}
      </div>
    </div>
  );
}

export function TeamDetailView({ detail, view }: Props) {
  const orderedStarters = useMemo(() => sortMainPlayers(detail.starters), [detail.starters]);
  const orderedReserves = useMemo(() => sortReservePlayers(detail.reserves), [detail.reserves]);
  const formationLabel = useMemo(() => formatFormation(detail.starters), [detail.starters]);
  const formationLayout = useMemo(() => getFormationLayout(formationLabel), [formationLabel]);
  const replacements = useMemo(() => buildReplacementMap(detail), [detail]);
  const fieldGroups = useMemo(() => buildFieldGroups(detail.starters), [detail.starters]);
  const hasMainLineup = orderedStarters.length > 0;
  const teamHeading = detail.cartolaTeamName?.trim() || detail.country;
  const teamMeta = [detail.country, detail.owner].filter(Boolean).join(" • ");
  const fieldHref = `/times/${detail.participantId}?round=${detail.roundNumber}&view=field`;
  const listHref = `/times/${detail.participantId}?round=${detail.roundNumber}&view=list`;

  const renderMainRows = (players: PublicLineupPlayer[]) =>
    players.map((player) => {
      const position = normalizePosition(player.positionName);

      return (
        <article
          key={`${player.source}-${player.athleteId}`}
          className={[
            "team-detail-row",
            player.counted ? "team-detail-row--counting" : "team-detail-row--inactive"
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="team-detail-row__pos">{position}</div>
          <div>
            <div className="team-detail-row__name">
              {getPlayerLabel(player.playerName)}
              {player.athleteId === detail.captainId ? " (C)" : ""}
            </div>
            <span className="team-detail-row__meta">
              {player.clubName} • {buildStatusText(player, detail, replacements)}
            </span>
          </div>
          <div
            className={[
              "team-detail-row__pts",
              isWaitingForMatch(player) ? "team-detail-row__pts--pending" : "",
              player.points !== null && player.points < 0 ? "team-detail-row__pts--negative" : ""
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {formatDisplayPoints(player)}
          </div>
        </article>
      );
    });

  const renderFieldGroup = (
    players: PublicLineupPlayer[],
    coords: Array<{ x: number; y: number }>,
    slotClassName?: string
  ) =>
    players.map((starter, index) => {
      const slot = coords[index];

      if (!slot) {
        return null;
      }

      const reserve = replacements.starterToReserve.get(starter.athleteId);
      const shown = reserve ?? starter;

      return (
        <div
          key={`slot-${starter.athleteId}`}
          className={slotClassName ? `team-detail-player-slot ${slotClassName}` : "team-detail-player-slot"}
          style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
        >
          <TacticalPlayer
            player={shown}
            inactive={!reserve && !starter.counted && starter.matchStarted}
            waiting={!reserve && isWaitingForMatch(starter)}
            reserveIn={Boolean(reserve)}
            reserveOut={Boolean(reserve)}
            isCaptain={shown.athleteId === detail.captainId}
            isLuxury={shown.athleteId === detail.reserveLuxuryId}
          />
        </div>
      );
    });

  const renderBenchList = () => {
    if (detail.reserves.length === 0) {
      return (
        <div className="team-detail-info-box">A API oficial não retornou reservas para esta rodada.</div>
      );
    }

    return (
      <div className="team-detail-bench">
        {orderedReserves.map((reserve) => (
          <article
            key={`reserve-${reserve.athleteId}`}
            className={[
              "team-detail-bench__item",
              reserve.counted ? "team-detail-bench__item--counting" : ""
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="team-detail-bench__avatar-wrap">
              <PlayerAvatar player={reserve} className="team-detail-bench__avatar" />
              {reserve.athleteId === detail.reserveLuxuryId ? (
                <span className="team-detail-chip team-detail-chip--luxury" aria-label="Reserva de luxo">
                  <LuxuryMarkerIcon />
                </span>
              ) : null}
            </div>
            <div>
              <div className="team-detail-bench__name">{getPlayerLabel(reserve.playerName)}</div>
              <span className="team-detail-bench__meta">
                {normalizePosition(reserve.positionName)} • {reserve.clubName} •{" "}
                {buildStatusText(reserve, detail, replacements)}
              </span>
            </div>
            <div
              className={[
                "team-detail-bench__score",
                isWaitingForMatch(reserve) ? "team-detail-bench__score--pending" : "",
                reserve.points !== null && reserve.points < 0
                  ? "team-detail-bench__score--negative"
                  : ""
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {formatDisplayPoints(reserve)}
            </div>
          </article>
        ))}
      </div>
    );
  };

  const renderFieldBench = () => {
    if (detail.reserves.length === 0) {
      return null;
    }

    return (
      <section className="team-detail-pitch-bench-wrap" aria-label="Reservas desta rodada">
        <div className="team-detail-pitch-bench__header">
          <h3 className="team-detail-subtitle">Reservas</h3>
        </div>
        <div className="team-detail-pitch-bench">
          {orderedReserves.map((reserve) => (
            <article
              key={`pitch-reserve-${reserve.athleteId}`}
              className={[
                "team-detail-pitch-bench__item",
                reserve.counted ? "team-detail-pitch-bench__item--counting" : ""
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="team-detail-pitch-bench__avatar-wrap">
                <PlayerAvatar player={reserve} className="team-detail-pitch-bench__avatar" />
                {reserve.athleteId === detail.reserveLuxuryId ? (
                  <span className="team-detail-chip team-detail-chip--luxury" aria-label="Reserva de luxo">
                    <LuxuryMarkerIcon />
                  </span>
                ) : null}
              </div>
              <div className="team-detail-pitch-bench__name">{getPlayerLabel(reserve.playerName)}</div>
              <div
                className={[
                  "team-detail-pitch-bench__score",
                  isWaitingForMatch(reserve) ? "team-detail-pitch-bench__score--pending" : "",
                  reserve.points !== null && reserve.points < 0
                    ? "team-detail-pitch-bench__score--negative"
                    : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {formatDisplayPoints(reserve)}
              </div>
            </article>
          ))}
        </div>
        <div className="team-detail-marker-legend" aria-label="Legenda dos marcadores">
          <span><strong className="team-detail-marker-legend__token team-detail-marker-legend__token--captain">C</strong> Capitão</span>
          <span><strong className="team-detail-marker-legend__token team-detail-marker-legend__token--luxury"><LuxuryMarkerIcon /></strong> Reserva de luxo</span>
          <span><strong className="team-detail-marker-legend__token team-detail-marker-legend__token--up"><ArrowUpMarkerIcon /></strong> Entrou</span>
          <span><strong className="team-detail-marker-legend__token team-detail-marker-legend__token--down"><ArrowDownMarkerIcon /></strong> Saiu</span>
        </div>
      </section>
    );
  };

  return (
    <section className="team-detail-shell">
      <article className="card public-home__panel team-detail-controls">
        <div className="public-detail-hero__top">
          <div>
            <div className="public-detail-hero__identity">
              <FlagBadge country={detail.country} className="flag-badge--hero" />
              <div className="team-detail-controls__top">
                <h1 className="team-detail-controls__title">{teamHeading}</h1>
                {teamMeta ? <p className="muted team-detail-controls__meta">{teamMeta}</p> : null}
              </div>
            </div>
          </div>
          <Link className="text-link team-detail-controls__back" href="/">
            voltar ao painel
          </Link>
        </div>
        <div className="public-detail-hero__stats public-detail-hero__stats--compact">
          <div className="public-kpi">
            <span className="public-kpi__label">Rodada</span>
            <strong>{detail.roundLabel.replace(/(\d+)a rodada/, "$1ª rodada")}</strong>
          </div>
          <div className="public-kpi">
            <span className="public-kpi__label">Pontuação total</span>
            <strong>{detail.totalPoints.toFixed(2)}</strong>
          </div>
        </div>
        <div className="team-detail-controls__bar">
          <div className="team-detail-toggle" role="tablist" aria-label="Modo de visualização">
            <Link
              href={fieldHref}
              className={view === "field" ? "is-active" : ""}
              aria-current={view === "field" ? "page" : undefined}
            >
              Campo
            </Link>
            <Link
              href={listHref}
              className={view === "list" ? "is-active" : ""}
              aria-current={view === "list" ? "page" : undefined}
            >
              Lista
            </Link>
          </div>
        </div>
      </article>

      <div className={`team-detail-grid${view === "list" ? " team-detail-grid--list" : ""}`}>
        {view === "field" ? (
          <article className="card public-home__panel team-detail-panel">
            <div className="team-detail-panel__head">
              <div>
                <h2 className="card__title">Escalação</h2>
              </div>
            </div>

            {!hasMainLineup ? (
              <div className="team-detail-info-box">
                Não foi possível carregar a escalação desta rodada no momento.
              </div>
            ) : (
              <div className="team-detail-pitch">
                <div className="team-detail-pitch__field-line team-detail-pitch__field-line--circle" />
                <div className="team-detail-pitch__field-line team-detail-pitch__field-line--half" />
                <div className="team-detail-pitch__field-line team-detail-pitch__field-line--spot" />
                <div className="team-detail-pitch__field-line team-detail-pitch__field-line--penalty-top" />
                <div className="team-detail-pitch__field-line team-detail-pitch__field-line--penalty-bottom" />
                <div className="team-detail-pitch__field-line team-detail-pitch__field-line--goal-top" />
                <div className="team-detail-pitch__field-line team-detail-pitch__field-line--goal-bottom" />

                {renderFieldGroup(fieldGroups.attack, formationLayout.attack)}
                {renderFieldGroup(fieldGroups.midfield, formationLayout.midfield)}
                {renderFieldGroup(fieldGroups.defense, formationLayout.defense)}
                {renderFieldGroup(fieldGroups.goalkeeper, formationLayout.goalkeeper)}
                {renderFieldGroup(
                  fieldGroups.coach,
                  formationLayout.coach,
                  "team-detail-player-slot--coach"
                )}

                <div className="team-detail-pitch__formation-mark">{formationLabel}</div>
              </div>
            )}

            {renderFieldBench()}
          </article>
        ) : null}

        <article className="card public-home__panel team-detail-panel">
          <div className="team-detail-panel__head">
            <div>
              <h2 className="card__title">Time Principal</h2>
              {view === "list" ? <p className="muted">Formação {formationLabel}</p> : null}
            </div>
          </div>
          {hasMainLineup ? (
            <div className="team-detail-list">{renderMainRows(orderedStarters)}</div>
          ) : (
            <div className="team-detail-info-box">
              A lista principal será exibida assim que a API retornar os atletas da rodada.
            </div>
          )}
        </article>

        {view === "list" ? (
          <article className="card public-home__panel team-detail-panel">
            <div className="team-detail-panel__head">
              <div>
                <h2 className="card__title">Reservas</h2>
              </div>
            </div>
            {renderBenchList()}
          </article>
        ) : null}
      </div>
    </section>
  );
}
