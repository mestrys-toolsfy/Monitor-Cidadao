import { rotuloCargo } from "@/lib/civic/linguagem";
import { ANO_MANDATO, TURNO_PADRAO, bancadaEntradaSchema, type CargoBancada } from "@/lib/validators/bancada";
import type { VotoPayload } from "@/types";

export const ROTULOS_CARGO: Record<CargoBancada, string> = {
  presidente: rotuloCargo("presidente"),
  governador: rotuloCargo("governador"),
  senador: rotuloCargo("senador"),
  deputado_federal: rotuloCargo("deputado_federal"),
  deputado_estadual: rotuloCargo("deputado_estadual"),
};

/** Monta o payload em claro. Só existe na memória, antes de cifrar. */
export function montarPayloadBancada(entrada: {
  cargo: CargoBancada;
  brancoOuNulo: boolean;
  identificador: string;
}): VotoPayload {
  const parsed = bancadaEntradaSchema.parse({
    ...entrada,
    anoEleicao: ANO_MANDATO,
    turno: TURNO_PADRAO,
  });
  return {
    politico_id: parsed.brancoOuNulo ? "branco-ou-nulo" : parsed.identificador,
    ano_eleicao: parsed.anoEleicao,
    turno: parsed.turno,
    cargo: parsed.cargo,
  };
}

/** Texto cidadão a partir do identificador que estava dentro do voto cifrado. */
export function descreverEscolha(politicoId: string): string {
  if (politicoId === "branco-ou-nulo") {
    return "Voto em branco ou nulo";
  }
  if (politicoId.startsWith("camara:")) {
    const [, id, nome, partido, uf] = politicoId.split(":");
    if (nome) {
      return [nome, partido, uf].filter(Boolean).join(" · ");
    }
    return id ? `Deputado federal, ficha ${id}` : "Deputado federal";
  }
  if (politicoId.startsWith("manual:")) {
    return politicoId.slice("manual:".length).replaceAll(":", " · ");
  }
  return "Escolha protegida";
}
