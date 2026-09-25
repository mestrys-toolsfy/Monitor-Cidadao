import { buscarJson, ErroApiGoverno } from "@/lib/api/http";
import { limparTextoPublico } from "@/lib/civic/linguagem";
import {
  exigirSchema,
  respostaProposicoesCamaraSchema,
  respostaVotacoesCamaraSchema,
  type ItemCongresso,
  type VotacaoPlenario,
} from "@/lib/validators/governo";

const BASE = "https://dadosabertos.camara.leg.br/api/v2";

/** Siglas com tradução cidadã. A listagem geral recente é quase só parecer interno. */
const SIGLAS_CIDADAS = ["PL", "PEC", "PLP", "MPV"] as const;

function limitar(valor: number): number {
  if (!Number.isFinite(valor)) {
    return 8;
  }
  return Math.min(20, Math.max(1, Math.trunc(valor)));
}

function fichaDaProposicao(id: number): string {
  return `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${id}`;
}

/**
 * A Câmara devolve `{ dados: [...] }`.
 * Ficam só os campos da tela: sigla, número, ano, ementa, data e link da ficha.
 */
function lerProposicoes(body: unknown): ItemCongresso[] {
  const parsed = exigirSchema(respostaProposicoesCamaraSchema, body, "camara");
  return parsed.dados.map((item) => ({
    id: String(item.id),
    casa: "camara",
    sigla: item.siglaTipo,
    titulo: `${item.siglaTipo} ${item.numero}/${item.ano}`,
    ementa: limparTextoPublico(item.ementa),
    data: item.dataApresentacao,
    fonteUrl: fichaDaProposicao(item.id),
    tipoDocumento: null,
  }));
}

/**
 * Votações do órgão 180 (Plenário). O campo `siglaOrgao` confirma PLEN.
 * Aprovação 1 vira true, 0 vira false, null permanece null.
 */
function lerVotacoes(body: unknown): VotacaoPlenario[] {
  const parsed = exigirSchema(respostaVotacoesCamaraSchema, body, "camara");
  return parsed.dados
    .filter((item) => item.siglaOrgao === "PLEN")
    .map((item) => ({
      id: item.id,
      data: item.dataHoraRegistro,
      descricao: limparTextoPublico(item.descricao),
      aprovada: item.aprovacao === null ? null : item.aprovacao === 1,
      fonteUrl: item.uri,
    }));
}

async function buscarSigla(sigla: (typeof SIGLAS_CIDADAS)[number], itens: number): Promise<ItemCongresso[]> {
  const url = new URL(`${BASE}/proposicoes`);
  url.searchParams.set("siglaTipo", sigla);
  url.searchParams.set("itens", String(itens));
  url.searchParams.set("ordem", "DESC");
  url.searchParams.set("ordenarPor", "id");
  const body = await buscarJson(url.toString(), "camara");
  return lerProposicoes(body);
}

/**
 * Proposições recentes de PL, PEC, PLP e MPV, as mais novas primeiro.
 * Se uma sigla falhar e outra responder, a lista segue com o que chegou.
 * Se todas falharem, o erro sobe para a página mostrar o aviso da Câmara.
 */
export async function listarProposicoesRecentes(limite = 8): Promise<ItemCongresso[]> {
  const itens = limitar(limite);
  const grupos = await Promise.all(
    SIGLAS_CIDADAS.map(async (sigla) => {
      try {
        return await buscarSigla(sigla, itens);
      } catch (error) {
        return error;
      }
    }),
  );

  const ok = grupos.filter((grupo): grupo is ItemCongresso[] => Array.isArray(grupo));
  if (ok.length === 0) {
    const falha = grupos.find((grupo) => grupo instanceof ErroApiGoverno);
    if (falha instanceof ErroApiGoverno) {
      throw falha;
    }
    throw new ErroApiGoverno("camara", "http", "O serviço público não respondeu.");
  }

  return ok
    .flat()
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, itens);
}

/** Votações nominais e simbólicas mais recentes do plenário. */
export async function listarVotacoesPlenario(limite = 8): Promise<VotacaoPlenario[]> {
  const itens = limitar(limite);
  const url = new URL(`${BASE}/votacoes`);
  url.searchParams.set("idOrgao", "180");
  url.searchParams.set("itens", String(itens));
  url.searchParams.set("ordem", "DESC");
  url.searchParams.set("ordenarPor", "dataHoraRegistro");
  const body = await buscarJson(url.toString(), "camara");
  return lerVotacoes(body).slice(0, itens);
}
