import { z } from "zod";

export const cartolaTeamSearchSchema = z.array(
  z.object({
    time_id: z.number(),
    slug: z.string(),
    nome: z.string(),
    nome_cartola: z.string(),
    url_escudo_png: z.string().url().nullable().optional()
  })
);

export const cartolaFixturesSchema = z.object({
  rodada: z.number(),
  clubes: z.record(
    z.object({
      id: z.number(),
      nome: z.string(),
      abreviacao: z.string(),
      slug: z.string(),
      escudos: z.record(z.string().url())
    })
  ),
  partidas: z.array(
    z.object({
      partida_id: z.number(),
      clube_casa_id: z.number(),
      clube_visitante_id: z.number(),
      partida_data: z.string(),
      timestamp: z.number().optional(),
      valida: z.boolean(),
      placar_oficial_mandante: z.number().nullable(),
      placar_oficial_visitante: z.number().nullable()
    })
  )
});

export const cartolaAthletesMarketSchema = z.object({
  rodada: z.number().nullable().optional(),
  total_atletas: z.number().nullable().optional(),
  atletas: z.array(
    z.object({
      atleta_id: z.number(),
      clube_id: z.number(),
      posicao_id: z.number(),
      apelido: z.string(),
      nome: z.string(),
      foto: z.string().url().nullable().optional()
    })
  ),
  clubes: z.record(z.object({ id: z.number(), nome: z.string() })),
  posicoes: z.record(z.object({ id: z.number(), nome: z.string(), abreviacao: z.string() }))
});

export const cartolaAthletesScoredSchema = z.object({
  atletas: z.record(
    z.object({
      apelido: z.string(),
      pontuacao: z.number(),
      posicao_id: z.number(),
      clube_id: z.number(),
      entrou_em_campo: z.boolean()
    })
  )
});

export const cartolaMarketStatusSchema = z.object({
  rodada_atual: z.number(),
  status_mercado: z.number(),
  game_over: z.boolean(),
  mercado_pos_rodada: z.boolean(),
  bola_rolando: z.boolean(),
  times_escalados: z.number().nullable().optional(),
  rodada_final: z.number().nullable().optional(),
  fechamento: z
    .object({
      dia: z.number(),
      mes: z.number(),
      ano: z.number(),
      hora: z.number(),
      minuto: z.number(),
      timestamp: z.number()
    })
    .nullable()
    .optional()
});

export const cartolaLineupSchema = z.object({
  time: z.object({
    time_id: z.number(),
    nome: z.string(),
    nome_cartola: z.string()
  }),
  pontos: z.number().nullable().optional(),
  patrimonio: z.number().nullable().optional(),
  atletas: z
    .array(
      z.object({
        atleta_id: z.number(),
        apelido: z.string(),
        pontos_num: z.number().nullable().optional(),
        posicao_id: z.number(),
        clube_id: z.number(),
        rodada_id: z.number().nullable().optional(),
        entrou_em_campo: z.boolean().nullable().optional()
      })
    )
    .default([]),
  reservas: z
    .array(
      z.object({
        atleta_id: z.number(),
        apelido: z.string(),
        pontos_num: z.number().nullable().optional(),
        posicao_id: z.number(),
        clube_id: z.number(),
        rodada_id: z.number().nullable().optional(),
        entrou_em_campo: z.boolean().nullable().optional()
      })
    )
    .default([]),
  capitao_id: z.number().nullable().optional(),
  reserva_luxo_id: z.number().nullable().optional()
});
