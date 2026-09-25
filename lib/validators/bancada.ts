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

/** Campos em claro só no formulário, antes de virar o identificador que será cifrado. */
export const escolhaManualSchema = z.object({
  nome: z.string().trim().min(2, { error: "Informe o nome." }),
  uf: z.string().trim().regex(/^[A-Z]{2}$/, { error: "Informe a UF com duas letras." }),
  partido: z.string().trim().max(30),
  identificador: z.string().trim().max(80),
});

export type BancadaEntrada = z.infer<typeof bancadaEntradaSchema>;
export type CargoBancada = z.infer<typeof cargoSchema>;
