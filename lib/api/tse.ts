import { z } from "zod";
import { buscarJson, ErroApiGoverno } from "@/lib/api/http";

/**
 * Arquivo EA11 da divulgação oficial de resultados (ciclo ele2024).
 * Não é o voto secreto do usuário e não entra na linha do tempo desta fase.
 * URL vista em 25/09/2026: https://resultados.tse.jus.br/oficial/comum/config/ele-c.json
 */
const URL_CONFIGURACAO = "https://resultados.tse.jus.br/oficial/comum/config/ele-c.json";

const eleicaoSchema = z.object({
  cd: z.string().min(1),
  nm: z.string().min(1),
  t: z.string().min(1),
});

const pleitoSchema = z.object({
  cd: z.string().min(1),
  dt: z.string().min(1),
  e: z.array(eleicaoSchema),
});

/** Chaves curtas do arquivo oficial: dg, hg, c e pl. */
const configuracaoSchema = z.object({
  dg: z.string().min(1),
  hg: z.string().min(1),
  c: z.string().min(1),
  pl: z.array(pleitoSchema),
});

export interface EleicaoDivulgada {
  codigo: string;
  nome: string;
  turno: string;
}

export interface PleitoDivulgado {
  codigo: string;
  data: string;
  eleicoes: EleicaoDivulgada[];
}

export interface ConfiguracaoEleicoes {
  ciclo: string;
  dataGeracao: string;
  horaGeracao: string;
  pleitos: PleitoDivulgado[];
}

/** O JSON do TSE grava o ordinal como entidade numérica, por exemplo `1&#186;`. */
function decodificarEntidades(texto: string): string {
  return texto.replace(/&#(\d+);/g, (trecho, codigo: string) => {
    const ponto = Number(codigo);
    if (!Number.isInteger(ponto) || ponto < 0 || ponto > 0x10ffff) {
      return trecho;
    }
    return String.fromCodePoint(ponto);
  });
}

/**
 * Lista pleitos e eleições publicados na configuração oficial do TSE.
 * Ainda não é chamada pela interface.
 */
export async function listarConfiguracaoEleicoes(): Promise<ConfiguracaoEleicoes> {
  const body = await buscarJson(URL_CONFIGURACAO, "tse");
  const parsed = configuracaoSchema.safeParse(body);
  if (!parsed.success) {
    throw new ErroApiGoverno("tse", "parse", "A resposta pública veio em um formato inesperado.");
  }

  return {
    ciclo: parsed.data.c,
    dataGeracao: parsed.data.dg,
    horaGeracao: parsed.data.hg,
    pleitos: parsed.data.pl.map((pleito) => ({
      codigo: pleito.cd,
      data: pleito.dt,
      eleicoes: pleito.e.map((eleicao) => ({
        codigo: eleicao.cd,
        nome: decodificarEntidades(eleicao.nm),
        turno: eleicao.t,
      })),
    })),
  };
}
