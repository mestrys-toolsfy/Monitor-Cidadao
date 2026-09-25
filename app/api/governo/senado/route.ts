import { NextResponse } from "next/server";
import { listarMateriasRecentes } from "@/lib/api/senado";
import { listaCongressoSchema } from "@/lib/validators/governo";

export const revalidate = 900;

/**
 * Proxy só de dado público do Senado. Não recebe voto nem chave privada.
 * A lista já sai reduzida aos campos da tela.
 */
export async function GET() {
  try {
    const parsed = listaCongressoSchema.safeParse(await listarMateriasRecentes(8));
    if (!parsed.success) {
      return NextResponse.json(
        { erro: "A resposta do Senado veio em um formato inesperado." },
        { status: 502 },
      );
    }
    return NextResponse.json({ itens: parsed.data });
  } catch {
    return NextResponse.json({ erro: "Não foi possível consultar o Senado Federal agora." }, { status: 502 });
  }
}
