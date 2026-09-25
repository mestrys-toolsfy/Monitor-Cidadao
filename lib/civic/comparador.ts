import type { VotacaoNominal } from "@/lib/validators/governo";

export type TomVoto = "sim" | "nao" | "neutro";

export interface CelulaComparador {
  deputadoId: number;
  rotulo: string;
  tom: TomVoto;
}

export interface LinhaComparador {
  id: string;
  titulo: string;
  data: string;
  fonteUrl: string;
  celulas: CelulaComparador[];
}

/** Traduz o tipo publicado pela Câmara para linguagem cidadã. */
export function traduzirTipoVoto(tipo: string): { rotulo: string; tom: TomVoto } {
  const chave = tipo
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replaceAll("ã", "a")
    .replaceAll("ç", "c");
  if (chave === "sim") return { rotulo: "Votou sim", tom: "sim" };
  if (chave === "nao" || chave === "não") return { rotulo: "Votou não", tom: "nao" };
  if (chave === "obstrucao") return { rotulo: "Tentativa de atrasar a votação", tom: "neutro" };
  if (chave === "abstencao") return { rotulo: "Abstenção", tom: "neutro" };
  return { rotulo: "Sem registro individual", tom: "neutro" };
}

/**
 * Cruza a lista pública com os deputados já abertos no navegador.
 * Quem não votou naquela lista aparece como sem registro.
 */
export function cruzarBancada(
  votacoes: VotacaoNominal[],
  deputados: { id: number; rotulo: string }[],
): LinhaComparador[] {
  return votacoes.map((votacao) => ({
    id: votacao.id,
    titulo: votacao.descricao,
    data: votacao.data,
    fonteUrl: votacao.fonteUrl,
    celulas: deputados.map((deputado) => {
      const voto = votacao.votos.find((item) => item.deputadoId === deputado.id);
      const traducao = traduzirTipoVoto(voto?.tipoVoto ?? "");
      return { deputadoId: deputado.id, rotulo: traducao.rotulo, tom: traducao.tom };
    }),
  }));
}

/** Lê o id da Câmara gravado dentro do voto cifrado. */
export function deputadoDaEscolha(politicoId: string): { id: number; rotulo: string } | null {
  if (!politicoId.startsWith("camara:")) return null;
  const partes = politicoId.split(":");
  const id = Number(partes[1]);
  if (!Number.isInteger(id) || id <= 0) return null;
  const nome = partes[2];
  const partido = partes[3];
  const uf = partes[4];
  const rotulo = nome ? [nome, partido, uf].filter(Boolean).join(" · ") : `Deputado federal, ficha ${id}`;
  return { id, rotulo };
}
