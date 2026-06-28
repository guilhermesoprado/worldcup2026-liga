export type PublicStanding = {
  participantId: string;
  country: string;
  owner: string;
  cartolaTeamName: string;
  points: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  position: number;
  statusLabel: "qualified" | "in_contention" | "eliminated";
};

export type PublicMatch = {
  id: string;
  phase: string;
  phaseSlot?: string;
  groupCode: string | null;
  roundNumber: number;
  state: "partial" | "official" | "scheduled";
  homeParticipantId: string;
  awayParticipantId: string;
  homeCountry: string;
  awayCountry: string;
  homeOwner: string;
  awayOwner: string;
  homeCartolaTeamName: string;
  awayCartolaTeamName: string;
  homePoints: number | null;
  awayPoints: number | null;
  kickoffLabel: string;
};

export type PublicMostPickedPlayer = {
  athleteId: number;
  playerName: string;
  clubName: string;
  positionName: string;
  pickCount: number;
  rankPosition: number;
};

export type PublicLineupPlayer = {
  athleteId: number;
  playerName: string;
  photoUrl: string | null;
  clubName: string;
  positionName: string;
  points: number | null;
  entered: boolean;
  matchStarted: boolean;
  source: "starter" | "reserve";
  counted: boolean;
};

export type PublicTeamDetail = {
  participantId: string;
  owner: string;
  country: string;
  cartolaTeamName: string;
  roundNumber: number;
  roundLabel: string;
  state: "partial" | "official";
  totalPoints: number;
  starters: PublicLineupPlayer[];
  reserves: PublicLineupPlayer[];
  effectivePlayers: PublicLineupPlayer[];
  captainId: number | null;
  reserveLuxuryId: number | null;
  usesLiveData: boolean;
};
