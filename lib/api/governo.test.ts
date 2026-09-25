import { afterEach, describe, expect, it, vi } from "vitest";
import { listarDeputados, listarProposicoesRecentes } from "@/lib/api/camara";
import { listarMateriasRecentes } from "@/lib/api/senado";
import { ErroApiGoverno } from "@/lib/api/http";
import { rotuloCivico, traduzirTermoCivico } from "@/lib/civic/linguagem";

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function proposicao(sigla: string, id: number, data: string) {
  return {
    id,
    uri: `https://dadosabertos.camara.leg.br/api/v2/proposicoes/${id}`,
    siglaTipo: sigla,
    codTipo: 139,
    numero: id,
    ano: 2026,
    ementa: `  Ementa ${sigla}  \n com quebra.  `,
    dataApresentacao: data,
  };
}

describe("dados públicos do Congresso", () => {
  it("lista proposições recentes da Câmara", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const sigla = url.searchParams.get("siglaTipo") ?? "PL";
        const id = { PL: 10, PEC: 20, PLP: 30, MPV: 40 }[sigla] ?? 1;
        const data = { PL: "2026-09-24T15:00", PEC: "2026-09-23T12:00", PLP: "2026-09-22T09:00", MPV: "2026-09-21T08:00" }[
          sigla
        ] ?? "2026-09-01T00:00";
        return jsonResponse({ dados: [proposicao(sigla, id, data)] });
      }),
    );

    const itens = await listarProposicoesRecentes(8);

    expect(itens).toHaveLength(4);
    expect(itens[0]).toMatchObject({
      id: "10",
      casa: "camara",
      sigla: "PL",
      titulo: "PL 10/2026",
      ementa: "Ementa PL com quebra.",
      fonteUrl: "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=10",
    });
    expect(itens.map((item) => item.sigla)).toEqual(["PL", "PEC", "PLP", "MPV"]);
  });

  it("mantém as siglas que responderam quando uma consulta da Câmara falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const sigla = url.searchParams.get("siglaTipo") ?? "PL";
        if (sigla === "PLP") {
          return jsonResponse({ status: 500 }, 500);
        }
        return jsonResponse({
          dados: [proposicao(sigla, sigla === "PL" ? 10 : 20, "2026-09-24T15:00")],
        });
      }),
    );

    const itens = await listarProposicoesRecentes(8);
    expect(itens.map((item) => item.sigla).sort()).toEqual(["MPV", "PEC", "PL"]);
  });

  it("recusa JSON inválido da Câmara pelo Zod", async () => {
    const corpo = { dados: [{ id: "nao-e-numero" }] };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(corpo)));

    await expect(listarProposicoesRecentes(8)).rejects.toBeInstanceOf(ErroApiGoverno);
    await expect(listarProposicoesRecentes(8)).rejects.toThrow(/formato inesperado/);
    await expect(listarProposicoesRecentes(8)).rejects.not.toThrow(/nao-e-numero/);
  });

  it("traduz siglas e termos para linguagem cidadã", () => {
    expect(traduzirTermoCivico("PL")).toBe("Projeto de Lei");
    expect(traduzirTermoCivico("PEC")).toBe("Proposta de Emenda");
    expect(traduzirTermoCivico("PLP")).toBe("Projeto de Lei Complementar");
    expect(traduzirTermoCivico("MPV")).toBe("Medida Provisória");
    expect(traduzirTermoCivico("CEAP")).toBe("Gastos do mandato");
    expect(traduzirTermoCivico("relator")).toBe("responsável pelo parecer");
    expect(traduzirTermoCivico("obstrução")).toBe("tentativa de atrasar a votação");
    expect(rotuloCivico("PL")).toBe("PL · Projeto de Lei");
    expect(traduzirTermoCivico("XYZ")).toBeNull();
  });

  it("lê matérias recentes do Senado a partir do array oficial", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          {
            id: 2433271,
            codigoMateria: 102654,
            identificacao: "PLN 13/1966",
            ementa: "Dispõe sobre o Sistema Tributário Nacional.\n",
            tipoDocumento: "Projeto de Lei Ordinária",
            dataApresentacao: "1966-09-15",
            dataUltimaAtualizacao: "2026-09-22T14:32:42.638",
            autoria: "Presidência da República",
          },
        ]),
      ),
    );

    const itens = await listarMateriasRecentes(8);
    expect(itens).toEqual([
      {
        id: "2433271",
        casa: "senado",
        sigla: "PLN",
        titulo: "PLN 13/1966",
        ementa: "Dispõe sobre o Sistema Tributário Nacional.",
        data: "2026-09-22T14:32:42.638",
        fonteUrl: "https://www25.senado.leg.br/web/atividade/materias/-/materia/102654",
        tipoDocumento: "Projeto de Lei Ordinária",
      },
    ]);
  });

  it("busca deputados pelo nome na rota oficial da Câmara", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v2/deputados");
      expect(url.searchParams.get("nome")).toBe("lula");
      expect(url.searchParams.get("itens")).toBe("10");
      return jsonResponse({
        dados: [
          {
            id: 220669,
            uri: "https://dadosabertos.camara.leg.br/api/v2/deputados/220669",
            nome: "Lula da Fonte",
            siglaPartido: "PP",
            uriPartido: "https://dadosabertos.camara.leg.br/api/v2/partidos/37903",
            siglaUf: "PE",
            idLegislatura: 57,
            urlFoto: "https://www.camara.leg.br/internet/deputado/bandep/220669.jpg",
            email: "dep.luladafonte@camara.leg.br",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const itens = await listarDeputados("lula");
    expect(itens).toEqual([{ id: 220669, nome: "Lula da Fonte", partido: "PP", uf: "PE" }]);
    expect(JSON.stringify(itens)).not.toContain("email");
  });
});
