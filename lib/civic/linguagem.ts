const TRADUCOES: Record<string, string> = {
  pl: "Projeto de Lei",
  pec: "Proposta de Emenda",
  plp: "Projeto de Lei Complementar",
  mpv: "Medida Provisória",
  ceap: "Gastos do mandato",
  relator: "responsável pelo parecer",
  obstrucao: "tentativa de atrasar a votação",
};

function chave(termo: string): string {
  return termo
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replaceAll("ç", "c")
    .replaceAll("á", "a")
    .replaceAll("à", "a")
    .replaceAll("â", "a")
    .replaceAll("ã", "a")
    .replaceAll("é", "e")
    .replaceAll("ê", "e")
    .replaceAll("í", "i")
    .replaceAll("ó", "o")
    .replaceAll("ô", "o")
    .replaceAll("õ", "o")
    .replaceAll("ú", "u");
}

/**
 * Traduz sigla ou termo do Congresso para linguagem cidadã.
 * Termo desconhecido devolve null. Não altera o texto original.
 */
export function traduzirTermoCivico(termo: string): string | null {
  return TRADUCOES[chave(termo)] ?? null;
}

/** "PL · Projeto de Lei". Sem tradução, devolve o termo já aparado. */
export function rotuloCivico(termo: string): string {
  const limpo = termo.trim();
  const traducao = traduzirTermoCivico(limpo);
  if (!traducao) {
    return limpo;
  }
  return `${limpo} · ${traducao}`;
}

/** Junta quebras de linha e espaços repetidos que a API entrega na ementa. */
export function limparTextoPublico(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}
