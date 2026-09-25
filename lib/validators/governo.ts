import { z } from "zod";
import { ErroApiGoverno, type FonteGoverno } from "@/lib/api/http";

/**
 * Campos que a linha do tempo mostra. O restante do JSON oficial é descartado.
 * Falha de parse não inclui o corpo recebido.
 */
export const itemCongressoSchema = z.object({
  id: z.string().min(1),
  casa: z.enum(["camara", "senado"]),
  sigla: z.string().min(1),
  titulo: z.string().min(1),
  ementa: z.string(),
  data: z.string(),
  fonteUrl: z.url(),
  tipoDocumento: z.string().nullable(),
});

export const listaCongressoSchema = z.array(itemCongressoSchema);

export type ItemCongresso = z.infer<typeof itemCongressoSchema>;

/** Proposição na listagem da API v2 da Câmara. */
export const proposicaoCamaraSchema = z.object({
  id: z.number().int(),
  uri: z.url(),
  siglaTipo: z.string().min(1),
  numero: z.number().int(),
  ano: z.number().int(),
  ementa: z.string(),
  dataApresentacao: z.string().min(1),
});

export const respostaProposicoesCamaraSchema = z.object({
  dados: z.array(proposicaoCamaraSchema),
});

/** Votação na listagem da API v2. `aprovacao` vem 0, 1 ou null. */
export const votacaoCamaraSchema = z.object({
  id: z.string().min(1),
  uri: z.url(),
  data: z.string().min(1),
  dataHoraRegistro: z.string().min(1),
  siglaOrgao: z.string().min(1),
  descricao: z.string(),
  aprovacao: z.number().int().nullable(),
});

export const respostaVotacoesCamaraSchema = z.object({
  dados: z.array(votacaoCamaraSchema),
});

/** Deputado em exercício na listagem `GET /deputados`. */
export const deputadoCamaraSchema = z.object({
  id: z.number().int(),
  nome: z.string().min(1),
  siglaPartido: z.string().min(1).nullable().optional(),
  siglaUf: z.string().min(2).nullable().optional(),
});

export const respostaDeputadosCamaraSchema = z.object({
  dados: z.array(deputadoCamaraSchema),
});

export const deputadoResumoSchema = z.object({
  id: z.number().int(),
  nome: z.string().min(1),
  partido: z.string().min(1),
  uf: z.string().min(2),
});

export const listaDeputadosResumoSchema = z.array(deputadoResumoSchema);

export type DeputadoResumo = z.infer<typeof deputadoResumoSchema>;

export const votacaoPlenarioSchema = z.object({
  id: z.string().min(1),
  data: z.string().min(1),
  descricao: z.string(),
  aprovada: z.boolean().nullable(),
  fonteUrl: z.url(),
});

export const listaVotacoesPlenarioSchema = z.array(votacaoPlenarioSchema);

export type VotacaoPlenario = z.infer<typeof votacaoPlenarioSchema>;

/** Processo resumido do Senado (`GET /dadosabertos/processo`). */
export const processoSenadoSchema = z.object({
  id: z.number().int(),
  codigoMateria: z.number().int(),
  identificacao: z.string().min(1),
  ementa: z.string(),
  tipoDocumento: z.string().optional(),
  dataApresentacao: z.string().optional(),
  dataUltimaAtualizacao: z.string().optional(),
});

export const listaProcessosSenadoSchema = z.array(processoSenadoSchema);

export function exigirSchema<T>(schema: z.ZodType<T>, body: unknown, fonte: FonteGoverno): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ErroApiGoverno(fonte, "parse", "A resposta pública veio em um formato inesperado.");
  }
  return parsed.data;
}
