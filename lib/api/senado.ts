import { buscarJson } from "@/lib/api/http";
import { limparTextoPublico } from "@/lib/civic/linguagem";
import { exigirSchema, listaProcessosSenadoSchema, type ItemCongresso } from "@/lib/validators/governo";

/** Atualizadas nos últimos 7 dias. Sem `numdias`, a API devolve toda a tramitação. */
const URL_PROCESSOS = "https://legis.senado.leg.br/dadosabertos/processo?numdias=7";

function limitar(valor: number): number {
  if (!Number.isFinite(valor)) {
    return 8;
  }
  return Math.min(20, Math.max(1, Math.trunc(valor)));
}

function siglaDeIdentificacao(identificacao: string): string {
  const match = /^([A-Za-z]+)/.exec(identificacao.trim());
  return match?.[1]?.toUpperCase() ?? identificacao.trim();
}

function fichaDaMateria(codigoMateria: number): string {
  return `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codigoMateria}`;
}

/**
 * O Senado devolve um array de processos, não o envelope `{ dados }` da Câmara.
 * A data da linha do tempo é a última atualização, quando a API a envia.
 */
function lerProcessos(body: unknown): ItemCongresso[] {
  const parsed = exigirSchema(listaProcessosSenadoSchema, body, "senado");
  return parsed.map((item) => ({
    id: String(item.id),
    casa: "senado",
    sigla: siglaDeIdentificacao(item.identificacao),
    titulo: limparTextoPublico(item.identificacao),
    ementa: limparTextoPublico(item.ementa),
    data: item.dataUltimaAtualizacao ?? item.dataApresentacao ?? "",
    fonteUrl: fichaDaMateria(item.codigoMateria),
    tipoDocumento: item.tipoDocumento ? limparTextoPublico(item.tipoDocumento) : null,
  }));
}

/** Matérias (processos) atualizadas recentemente, as mais novas primeiro. */
export async function listarMateriasRecentes(limite = 8): Promise<ItemCongresso[]> {
  const itens = limitar(limite);
  const body = await buscarJson(URL_PROCESSOS, "senado");
  return lerProcessos(body)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, itens);
}
