import { NextResponse } from "next/server";
import { listarProposicoesRecentes, listarVotacoesPlenario } from "@/lib/api/camara";
import { listaCongressoSchema, listaVotacoesPlenarioSchema } from "@/lib/validators/governo";

export const revalidate = 900;

function jsonErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

/**
 * Proxy só de dado público da Câmara. Não recebe voto nem chave privada.
 * `recurso=proposicoes` (padrão) ou `recurso=votacoes`.
 */
export async function GET(request: Request) {
  const recurso = new URL(request.url).searchParams.get("recurso") ?? "proposicoes";
  if (recurso !== "proposicoes" && recurso !== "votacoes") {
    return jsonErro("Consulta inválida.", 400);
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
