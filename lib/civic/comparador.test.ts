import { describe, expect, it } from "vitest";
import { cruzarBancada, deputadoDaEscolha, traduzirTipoVoto } from "@/lib/civic/comparador";
import type { VotacaoNominal } from "@/lib/validators/governo";

const VOTACAO: VotacaoNominal = {
  id: "2196833-307",
  data: "2023-07-05",
  descricao: "Aprovado o texto.",
  fonteUrl: "https://www.camara.leg.br/internet/votacao/detalheVotacao.asp?idVotacao=2196833-307",
  votos: [
    { deputadoId: 204498, nome: "Olival Marques", partido: "MDB", uf: "PA", tipoVoto: "Sim" },
    { deputadoId: 10, nome: "Outra Pessoa", partido: "PT", uf: "SP", tipoVoto: "Obstrução" },
  ],
};

describe("comparador cívico", () => {
  it("traduz sim, não e obstrução", () => {
    expect(traduzirTipoVoto("Sim").rotulo).toBe("Votou sim");
    expect(traduzirTipoVoto("Não").tom).toBe("nao");
    expect(traduzirTipoVoto("Obstrução").rotulo).toBe("Tentativa de atrasar a votação");
    expect(traduzirTipoVoto("").rotulo).toBe("Sem registro individual");
  });

  it("cruza só os deputados da bancada e não inventa voto", () => {
    const linhas = cruzarBancada([VOTACAO], [
      { id: 204498, rotulo: "Olival Marques" },
      { id: 99, rotulo: "Sem ficha" },
    ]);
    expect(linhas[0]?.celulas.map((celula) => celula.rotulo)).toEqual(["Votou sim", "Sem registro individual"]);
  });

  it("lê o deputado federal de dentro da escolha cifrada", () => {
    expect(deputadoDaEscolha("camara:73701:Benedita da Silva:PT:RJ")?.id).toBe(73701);
    expect(deputadoDaEscolha("branco-ou-nulo")).toBeNull();
    expect(deputadoDaEscolha("manual:Nome:PT:SP")).toBeNull();
  });
});
