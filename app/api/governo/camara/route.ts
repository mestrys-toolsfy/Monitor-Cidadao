import { NextResponse } from "next/server";
import { listarDeputados, listarProposicoesRecentes, listarVotacoesPlenario } from "@/lib/api/camara";
import { listaCongressoSchema, listaDeputadosResumoSchema, listaVotacoesPlenarioSchema } from "@/lib/validators/governo";

export const revalidate = 900;

function jsonErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

/**
 * Proxy só de dado público da Câmara. Não recebe voto nem chave privada.
 * `recurso=proposicoes` (padrão), `recurso=votacoes` ou `recurso=deputados`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const recurso = url.searchParams.get("recurso") ?? "proposicoes";
  if (recurso !== "proposicoes" && recurso !== "votacoes" && recurso !== "deputados") {
    return jsonErro("Consulta inválida.", 400);
  }

  if (recurso === "deputados") {
    const nome = url.searchParams.get("nome")?.trim() ?? "";
    if (nome.length < 3) {
      return jsonErro("Informe pelo menos 3 letras do nome.", 400);
    }
    try {
      const parsed = listaDeputadosResumoSchema.safeParse(await listarDeputados(nome));
      if (!parsed.success) {
        return jsonErro("A resposta da Câmara veio em um formato inesperado.", 502);
      }
      return NextResponse.json({ itens: parsed.data });
    } catch {
      return jsonErro("Não foi possível consultar a Câmara dos Deputados agora.", 502);
    }
  }

  try {
    if (recurso === "votacoes") {
      const parsed = listaVotacoesPlenarioSchema.safeParse(await listarVotacoesPlenario(8));
      if (!parsed.success) {
        return jsonErro("A resposta da Câmara veio em um formato inesperado.", 502);
      }
      return NextResponse.json({ itens: parsed.data });
    }

    const parsed = listaCongressoSchema.safeParse(await listarProposicoesRecentes(8));
    if (!parsed.success) {
      return jsonErro("A resposta da Câmara veio em um formato inesperado.", 502);
    }
    return NextResponse.json({ itens: parsed.data });
  } catch {
    return jsonErro("Não foi possível consultar a Câmara dos Deputados agora.", 502);
  }
}
