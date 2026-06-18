import {
  calculateGroupStandings,
  type GroupMatch
} from "@/domain/standings/calculate-group-standings";
import type {
  PublicMatch,
  PublicMostPickedPlayer,
  PublicStanding
} from "@/types/public";

type ParticipantSeed = {
  id: string;
  owner: string;
  country: string;
  cartolaTeamName: string;
  cartolaTeamId: number;
  groupCode: string;
};

const officialGroupTeams = [
  ["Mexico", "Africa do Sul", "Coreia do Sul", "Republica Tcheca"],
  ["Canada", "Bosnia", "Catar", "Suica"],
  ["Haiti", "Escocia", "Brasil", "Marrocos"],
  ["Estados Unidos", "Paraguai", "Australia", "Turquia"],
  ["Alemanha", "Curacao", "Costa do Marfim", "Equador"],
  ["Holanda", "Japao", "Suecia", "Tunisia"],
  ["Belgica", "Egito", "Ira", "Nova Zelandia"],
  ["Espanha", "Cabo Verde", "Arabia Saudita", "Uruguai"],
  ["Franca", "Senegal", "Iraque", "Noruega"],
  ["Argentina", "Argelia", "Austria", "Jordania"],
  ["Portugal", "RD Congo", "Uzbequistao", "Colombia"],
  ["Inglaterra", "Croacia", "Gana", "Panama"]
] as const;

const groupCodes = "ABCDEFGHIJKL".split("");

const countryAliases: Record<string, string> = {
  "Africa do Sul": "Africa do Sul",
  "África do Sul": "Africa do Sul",
  Alemanha: "Alemanha",
  "Arabia Saudita": "Arabia Saudita",
  "Arábia Saudita": "Arabia Saudita",
  Argelia: "Argelia",
  "Argélia": "Argelia",
  Argentina: "Argentina",
  Australia: "Australia",
  "Austrália": "Australia",
  Austria: "Austria",
  "Áustria": "Austria",
  Belgica: "Belgica",
  "Bélgica": "Belgica",
  Bosnia: "Bosnia",
  "Bósnia": "Bosnia",
  "Bósnia e Herzegovina": "Bosnia",
  Brasil: "Brasil",
  "Cabo Verde": "Cabo Verde",
  Canada: "Canada",
  "Canadá": "Canada",
  Catar: "Catar",
  Colombia: "Colombia",
  "Colômbia": "Colombia",
  "Coreia do Sul": "Coreia do Sul",
  "Costa do Marfim": "Costa do Marfim",
  Croacia: "Croacia",
  "Croácia": "Croacia",
  Curacao: "Curacao",
  "Curaçao": "Curacao",
  Egito: "Egito",
  Equador: "Equador",
  Escocia: "Escocia",
  "Escócia": "Escocia",
  Espanha: "Espanha",
  "Estados Unidos": "Estados Unidos",
  Franca: "Franca",
  "França": "Franca",
  Gana: "Gana",
  Haiti: "Haiti",
  Holanda: "Holanda",
  Ira: "Ira",
  "Irã": "Ira",
  Iraque: "Iraque",
  Inglaterra: "Inglaterra",
  Japao: "Japao",
  "Japão": "Japao",
  Jordania: "Jordania",
  "Jordânia": "Jordania",
  Marrocos: "Marrocos",
  Mexico: "Mexico",
  "México": "Mexico",
  "Nova Zelandia": "Nova Zelandia",
  "Nova Zelândia": "Nova Zelandia",
  Noruega: "Noruega",
  Panama: "Panama",
  "Panamá": "Panama",
  Paraguai: "Paraguai",
  Portugal: "Portugal",
  "RD Congo": "RD Congo",
  "Republica Tcheca": "Republica Tcheca",
  "República Tcheca": "Republica Tcheca",
  Senegal: "Senegal",
  Suica: "Suica",
  "Suíça": "Suica",
  Suecia: "Suecia",
  "Suécia": "Suecia",
  Tunisia: "Tunisia",
  "Tunísia": "Tunisia",
  Turquia: "Turquia",
  Uruguai: "Uruguai",
  Uzbequistao: "Uzbequistao",
  "Uzbequistão": "Uzbequistao"
};

const groupCodeByCountry = officialGroupTeams.reduce<Record<string, string>>(
  (acc, teams, index) => {
    const groupCode = groupCodes[index] ?? "A";

    for (const country of teams) {
      acc[country] = groupCode;
    }

    return acc;
  },
  {}
);

const participantSeeds: Omit<ParticipantSeed, "groupCode">[] = [
  {
    id: "p01",
    owner: "Alan Junior",
    country: "Africa do Sul",
    cartolaTeamName: "ALL BLACKS C.R.F",
    cartolaTeamId: 50235319
  },
  {
    id: "p02",
    owner: "Alex Melo",
    country: "Alemanha",
    cartolaTeamName: "AdmGpi-FC",
    cartolaTeamId: 848616
  },
  {
    id: "p03",
    owner: "Angel Emir",
    country: "Arabia Saudita",
    cartolaTeamName: "Pangatirumiruaru F.C",
    cartolaTeamId: 47684449
  },
  {
    id: "p04",
    owner: "Angello de Jesus",
    country: "Argelia",
    cartolaTeamName: "Goldphoenixxx",
    cartolaTeamId: 49049903
  },
  {
    id: "p05",
    owner: "Ary",
    country: "Argentina",
    cartolaTeamName: "Flucamaleão",
    cartolaTeamId: 26148093
  },
  {
    id: "p06",
    owner: "Augusto",
    country: "Australia",
    cartolaTeamName: "Rodrigues Dostoievski FC",
    cartolaTeamId: 21911314
  },
  {
    id: "p07",
    owner: "Braz",
    country: "Austria",
    cartolaTeamName: "INSANOS22 FC",
    cartolaTeamId: 21166384
  },
  {
    id: "p08",
    owner: "Brena Castro",
    country: "Belgica",
    cartolaTeamName: "Sport Club Coquinha Geladaa",
    cartolaTeamId: 21252257
  },
  {
    id: "p09",
    owner: "Bruno Pinheiro",
    country: "Bosnia",
    cartolaTeamName: "Inazuma bk fc",
    cartolaTeamId: 8947926
  },
  {
    id: "p10",
    owner: "Bruno Santos",
    country: "Brasil",
    cartolaTeamName: "CR.bruvas.VG",
    cartolaTeamId: 11885204
  },
  {
    id: "p11",
    owner: "BUENOy",
    country: "Cabo Verde",
    cartolaTeamName: "King Bueno",
    cartolaTeamId: 51093439
  },
  {
    id: "p12",
    owner: "Bussunda",
    country: "Canada",
    cartolaTeamName: "Tabajara Team",
    cartolaTeamId: 51316752
  },
  {
    id: "p13",
    owner: "CLECYO TADEU",
    country: "Catar",
    cartolaTeamName: "CTFNFC",
    cartolaTeamId: 1868920
  },
  {
    id: "p14",
    owner: "Daniel Alves",
    country: "Colombia",
    cartolaTeamName: "FlaCaixa",
    cartolaTeamId: 3804100
  },
  {
    id: "p15",
    owner: "Davi",
    country: "Coreia do Sul",
    cartolaTeamName: "LOSS CLUB FC",
    cartolaTeamId: 50937109
  },
  {
    id: "p16",
    owner: "Elcius Ferreira",
    country: "Costa do Marfim",
    cartolaTeamName: "Flu Paraiba FC",
    cartolaTeamId: 10348841
  },
  {
    id: "p17",
    owner: "Euller Seguros",
    country: "Croacia",
    cartolaTeamName: "EULLER SEGUROS FC",
    cartolaTeamId: 17893306
  },
  {
    id: "p18",
    owner: "Elvan Leão",
    country: "Curacao",
    cartolaTeamName: "EL Engenharia",
    cartolaTeamId: 3494253
  },
  {
    id: "p19",
    owner: "Flávio Leão",
    country: "Egito",
    cartolaTeamName: "Verdao-Gpi",
    cartolaTeamId: 25698150
  },
  {
    id: "p20",
    owner: "Flávio Leão",
    country: "Equador",
    cartolaTeamName: "Camaleão do Sul FL",
    cartolaTeamId: 280
  },
  {
    id: "p21",
    owner: "Gabriel",
    country: "Escocia",
    cartolaTeamName: "MinhaEsposaDeixouFC",
    cartolaTeamId: 51316876
  },
  {
    id: "p22",
    owner: "Hiago",
    country: "Espanha",
    cartolaTeamName: "FC Loucura",
    cartolaTeamId: 51335700
  },
  {
    id: "p23",
    owner: "Higor Silva",
    country: "Estados Unidos",
    cartolaTeamName: "Inimigos Da Bola FC",
    cartolaTeamId: 51335005
  },
  {
    id: "p24",
    owner: "Iago Valcacer",
    country: "Franca",
    cartolaTeamName: "Valcacer CFC",
    cartolaTeamId: 47712537
  },
  {
    id: "p25",
    owner: "Isaque Alencar",
    country: "Gana",
    cartolaTeamName: "PikudosFC",
    cartolaTeamId: 51319971
  },
  {
    id: "p26",
    owner: "Jairan Bandeira",
    country: "Haiti",
    cartolaTeamName: "BandeirasFC",
    cartolaTeamId: 25588062
  },
  {
    id: "p27",
    owner: "João Calixto",
    country: "Holanda",
    cartolaTeamName: "MTAC_FUTEBOL_CLUBE",
    cartolaTeamId: 11011243
  },
  {
    id: "p28",
    owner: "Jonas Aguiar",
    country: "Inglaterra",
    cartolaTeamName: "Locomotiva SEP FC",
    cartolaTeamId: 8533101
  },
  {
    id: "p29",
    owner: "Jorge Henrique",
    country: "Ira",
    cartolaTeamName: "Spartanos GPI",
    cartolaTeamId: 6498420
  },
  {
    id: "p30",
    owner: "Kaio Felipe",
    country: "Iraque",
    cartolaTeamName: "20te Comer FC",
    cartolaTeamId: 18393254
  },
  {
    id: "p31",
    owner: "Kaio Felipe Reis",
    country: "Japao",
    cartolaTeamName: "Bonde da Unção",
    cartolaTeamId: 51319936
  },
  {
    id: "p32",
    owner: "Kevynn Teixeira",
    country: "Jordania",
    cartolaTeamName: "La Bestia Negra Esporte Club",
    cartolaTeamId: 1420273
  },
  {
    id: "p33",
    owner: "Luiz Fernando",
    country: "Marrocos",
    cartolaTeamName: "Karta city",
    cartolaTeamId: 29523428
  },
  {
    id: "p34",
    owner: "Luiz Felipe",
    country: "Mexico",
    cartolaTeamName: "Porco Milionário FC",
    cartolaTeamId: 50988454
  },
  {
    id: "p35",
    owner: "Markus Vinícius",
    country: "Noruega",
    cartolaTeamName: "Camisa Verde",
    cartolaTeamId: 2171766
  },
  {
    id: "p36",
    owner: "Mateus Maximo",
    country: "Nova Zelandia",
    cartolaTeamName: "MxSports Fc",
    cartolaTeamId: 811729
  },
  {
    id: "p37",
    owner: "Matheus Rodrigues",
    country: "Panama",
    cartolaTeamName: "EL Fênix F.C",
    cartolaTeamId: 6046227
  },
  {
    id: "p38",
    owner: "Mikeyas Rodrigues",
    country: "Paraguai",
    cartolaTeamName: "San Rodrigues Footbaal club",
    cartolaTeamId: 7281771
  },
  {
    id: "p39",
    owner: "Mister Jesus",
    country: "Portugal",
    cartolaTeamName: "Flamengo Libertadores2019",
    cartolaTeamId: 25640313
  },
  {
    id: "p40",
    owner: "Pablo",
    country: "RD Congo",
    cartolaTeamName: "F.C. BAYEN DE MADRID",
    cartolaTeamId: 3187198
  },
  {
    id: "p41",
    owner: "Pablo Donizete",
    country: "Republica Tcheca",
    cartolaTeamName: "Real Escalado FC",
    cartolaTeamId: 402600
  },
  {
    id: "p42",
    owner: "Robson Aguiar",
    country: "Senegal",
    cartolaTeamName: "AGROCAMPO 3312 4309 GPI",
    cartolaTeamId: 9747076
  },
  {
    id: "p43",
    owner: "Rodolfo",
    country: "Suecia",
    cartolaTeamName: "Rorintias",
    cartolaTeamId: 51006662
  },
  {
    id: "p44",
    owner: "Sávio Barbosa",
    country: "Suica",
    cartolaTeamName: "Método Acústica",
    cartolaTeamId: 44815445
  },
  {
    id: "p45",
    owner: "Sávio Santos",
    country: "Tunisia",
    cartolaTeamName: "Labregada FC",
    cartolaTeamId: 202201
  },
  {
    id: "p46",
    owner: "Tayllon",
    country: "Turquia",
    cartolaTeamName: "Pro Ghast",
    cartolaTeamId: 49517627
  },
  {
    id: "p47",
    owner: "Vagner Alves",
    country: "Uruguai",
    cartolaTeamName: "YMT10",
    cartolaTeamId: 18808833
  },
  {
    id: "p48",
    owner: "Walter Luis",
    country: "Uzbequistao",
    cartolaTeamName: "GurupiEC",
    cartolaTeamId: 14831930
  }
];

export const participants = participantSeeds.map((participant) => ({
  ...participant,
  groupCode:
    groupCodeByCountry[countryAliases[participant.country] ?? participant.country] ??
    "A"
}));

export const groups = groupCodes.map((code, index) => {
  const teams = officialGroupTeams[index] ?? [];

  return {
    code,
    displayName: `Grupo ${code}`,
    displayOrder: index + 1,
    participants: teams
      .map((team) =>
        participants.find(
          (participant) =>
            (countryAliases[participant.country] ?? participant.country) === team
        )
      )
      .filter(
        (participant): participant is (typeof participants)[number] =>
          Boolean(participant)
      )
  };
});

const matchesByGroup = groups.flatMap((group, groupIndex) => {
  const [first, second, third, fourth] = group.participants;
  const scoreSeed = 88 + groupIndex * 3;

  return [
    {
      id: `${group.code}-r1-m1`,
      phase: "groups",
      groupCode: group.code,
      roundNumber: 1,
      state: "partial" as const,
      kickoffLabel: "1a rodada",
      homeParticipantId: first.id,
      awayParticipantId: second.id,
      homeCountry: first.country,
      awayCountry: second.country,
      homeOwner: first.owner,
      awayOwner: second.owner,
      homeCartolaTeamName: first.cartolaTeamName,
      awayCartolaTeamName: second.cartolaTeamName,
      homePoints: Number((scoreSeed + 6.43).toFixed(2)),
      awayPoints: Number(
        (scoreSeed + (groupIndex % 3 === 0 ? 2.12 : 9.08)).toFixed(2)
      )
    },
    {
      id: `${group.code}-r1-m2`,
      phase: "groups",
      groupCode: group.code,
      roundNumber: 1,
      state: "partial" as const,
      kickoffLabel: "1a rodada",
      homeParticipantId: third.id,
      awayParticipantId: fourth.id,
      homeCountry: third.country,
      awayCountry: fourth.country,
      homeOwner: third.owner,
      awayOwner: fourth.owner,
      homeCartolaTeamName: third.cartolaTeamName,
      awayCartolaTeamName: fourth.cartolaTeamName,
      homePoints: Number((scoreSeed + 14.25).toFixed(2)),
      awayPoints: Number(
        (scoreSeed + (groupIndex % 4 === 0 ? 10.7 : 19.41)).toFixed(2)
      )
    }
  ];
});

export const publicMatches: PublicMatch[] = matchesByGroup;

export const publicStandingsByGroup = groups.reduce<
  Record<string, PublicStanding[]>
>((acc, group) => {
  const groupMatches = publicMatches.filter((match) => match.groupCode === group.code);
  const standingInput: GroupMatch[] = groupMatches.map((match) => ({
    homeParticipantId: match.homeParticipantId,
    awayParticipantId: match.awayParticipantId,
    homePoints: match.homePoints ?? 0,
    awayPoints: match.awayPoints ?? 0
  }));

  const computed = calculateGroupStandings(standingInput);
  acc[group.code] = computed.map((standing, index) => {
    const participant = participants.find(
      (item) => item.id === standing.participantId
    )!;

    return {
      participantId: participant.id,
      country: participant.country,
      owner: participant.owner,
      cartolaTeamName: participant.cartolaTeamName,
      points: standing.points,
      matchesPlayed: standing.wins + standing.draws + standing.losses,
      wins: standing.wins,
      draws: standing.draws,
      losses: standing.losses,
      pointsFor: Number(standing.pointsFor.toFixed(2)),
      pointsAgainst: Number(standing.pointsAgainst.toFixed(2)),
      pointsDifference: Number(standing.pointsDifference.toFixed(2)),
      position: index + 1,
      statusLabel:
        index < 2 ? "qualified" : index === 2 ? "in_contention" : "eliminated"
    };
  });

  return acc;
}, {});

export const publicMostPickedPlayers: PublicMostPickedPlayer[] = [
  {
    athleteId: 1,
    playerName: "Brahim Diaz",
    clubName: "Marrocos",
    positionName: "Meia",
    pickCount: 18,
    rankPosition: 1
  },
  {
    athleteId: 2,
    playerName: "Gyokeres",
    clubName: "Suecia",
    positionName: "Atacante",
    pickCount: 15,
    rankPosition: 2
  },
  {
    athleteId: 3,
    playerName: "Kamada",
    clubName: "Japao",
    positionName: "Meia",
    pickCount: 14,
    rankPosition: 3
  },
  {
    athleteId: 4,
    playerName: "Rezaeian",
    clubName: "Ira",
    positionName: "Lateral",
    pickCount: 12,
    rankPosition: 4
  },
  {
    athleteId: 5,
    playerName: "Gravenberch",
    clubName: "Holanda",
    positionName: "Meia",
    pickCount: 10,
    rankPosition: 5
  }
];

export function resolveParticipantByCountry(country: string) {
  const canonicalCountry = countryAliases[country] ?? country;

  return participants.find(
    (participant) =>
      (countryAliases[participant.country] ?? participant.country) ===
      canonicalCountry
  );
}

export function getGroupStandings(groupCode: string) {
  return publicStandingsByGroup[groupCode] ?? [];
}

export function getGroupMatches(groupCode: string) {
  return publicMatches.filter((match) => match.groupCode === groupCode);
}

export function getCompetitionOverview() {
  return {
    phaseLabel: "Fase de grupos",
    phaseKey: "groups",
    completedMatches: 24,
    totalMatches: 72,
    currentRoundLabel: "1a rodada",
    stateLabel: "Parcial ao vivo"
  };
}
