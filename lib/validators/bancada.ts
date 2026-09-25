import { z } from "zod";

export const CARGOS = [
  "presidente",
  "governador",
  "senador",
  "deputado_federal",
  "deputado_estadual",
] as const;

export const cargoSchema = z.enum(CARGOS);

/** Mandato em curso acompanhado nesta fase. O cidadão não preenche turno. */
export const ANO_MANDATO = 2022;
export const TURNO_PADRAO = 1 as const;

export const bancadaEntradaSchema = z.object({
  cargo: cargoSchema,
  brancoOuNulo: z.boolean(),
  identificador: z.string().trim().min(1).max(240),
  anoEleicao: z.literal(ANO_MANDATO),
  turno: z.literal(TURNO_PADRAO),
});

export type BancadaEntrada = z.infer<typeof bancadaEntradaSchema>;
export type CargoBancada = z.infer<typeof cargoSchema>;
