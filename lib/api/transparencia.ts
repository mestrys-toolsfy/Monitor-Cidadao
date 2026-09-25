import { z } from "zod";
import { buscarJson, ErroApiGoverno } from "@/lib/api/http";

/**
 * Consulta de emendas parlamentares no Portal da Transparência.
 * Exige o header `chave-api-dados`. A chave sai só de PORTAL_TRANSPARENCIA_CHAVE
 * e não é escrita em log nem na URL.
 * Contrato: OpenAPI em https://api.portaldatransparencia.gov.br/v3/api-docs
 * GET https://api.portaldatransparencia.gov.br/api-de-dados/emendas?pagina=1
 * Ainda não é chamada pela interface.
 */
const URL_EMENDAS = "https://api.portaldatransparencia.gov.br/api-de-dados/emendas";

const emendaSchema = z.object({
  codigoEmenda: z.string().nullable().optional(),
  ano: z.number().int().nullable().optional(),
  tipoEmenda: z.string().nullable().optional(),
  autor: z.string().nullable().optional(),
  nomeAutor: z.string().nullable().optional(),
  numeroEmenda: z.string().nullable().optional(),
  valorPago: z.string().nullable().optional(),
});

const listaEmendasSchema = z.array(emendaSchema);

export interface EmendaParlamentar {
  codigoEmenda: string | null;
  ano: number | null;
  tipoEmenda: string | null;
  autor: string | null;
  nomeAutor: string | null;
  numeroEmenda: string | null;
  valorPago: string | null;
}

function lerChave(): string {
  const chave = process.env.PORTAL_TRANSPARENCIA_CHAVE;
  if (typeof chave !== "string" || chave.trim() === "") {
    throw new ErroApiGoverno(
      "transparencia",
      "configuracao",
      "A consulta ao Portal da Transparência não está configurada.",
    );
  }
  return chave.trim();
}

/** Emendas parlamentares de uma página. Sem a chave, falha antes de chamar a rede. */
export async function listarEmendasParlamentares(pagina = 1): Promise<EmendaParlamentar[]> {
  if (!Number.isInteger(pagina) || pagina < 1) {
    throw new ErroApiGoverno("transparencia", "parse", "A página da consulta é inválida.");
  }

  const chave = lerChave();
  const url = new URL(URL_EMENDAS);
  url.searchParams.set("pagina", String(pagina));

  const body = await buscarJson(url.toString(), "transparencia", {
    "chave-api-dados": chave,
  });
  const parsed = listaEmendasSchema.safeParse(body);
  if (!parsed.success) {
    throw new ErroApiGoverno("transparencia", "parse", "A resposta pública veio em um formato inesperado.");
  }

  return parsed.data.map((item) => ({
    codigoEmenda: item.codigoEmenda ?? null,
    ano: item.ano ?? null,
    tipoEmenda: item.tipoEmenda ?? null,
    autor: item.autor ?? null,
    nomeAutor: item.nomeAutor ?? null,
    numeroEmenda: item.numeroEmenda ?? null,
    valorPago: item.valorPago ?? null,
  }));
}
