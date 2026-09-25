import { NextResponse } from "next/server";
import { parseVoteAad } from "@/lib/crypto/envelopes";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { contemCampoDeVotoEmClaro, envelopeVotoSchema } from "@/lib/validators/voto";
import { z } from "zod";

export const dynamic = "force-dynamic";

function json(body: { erro: string } | { id: string }, status: number) {
  return NextResponse.json(body, { status });
}

/**
 * Recebe só o envelope cifrado. Voto em claro é recusado.
 * Sem sessão, 401. Sem Supabase configurado, 501.
 * O corpo não é registrado em log.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ erro: "Pedido inválido." }, 400);
  }

  if (contemCampoDeVotoEmClaro(body)) {
    return json({ erro: "O voto não pode ser enviado em claro." }, 400);
  }

  const parsed = envelopeVotoSchema.safeParse(body);
  if (!parsed.success) {
    return json({ erro: "Envelope de voto inválido." }, 400);
  }

  if (!isSupabaseConfigured()) {
    return json({ erro: "A persistência do voto protegido ainda não está configurada." }, 501);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return json({ erro: "É preciso entrar na conta para registrar o voto protegido." }, 401);
  }

  let aad: { userId: string; recordId: string };
  try {
    aad = parseVoteAad(parsed.data.aad);
  } catch {
    return json({ erro: "Envelope de voto inválido." }, 400);
  }

  if (aad.userId !== data.user.id || !z.uuid().safeParse(aad.recordId).success) {
    return json({ erro: "O voto protegido não pertence a esta conta." }, 400);
  }

  const { error: insertError } = await supabase.from("votos_cifrados").insert({
    id: aad.recordId,
    user_id: data.user.id,
    schema_version: parsed.data.v,
    alg: parsed.data.alg,
    ciphertext: parsed.data.ct,
    iv: parsed.data.iv,
    wrapped_key: parsed.data.wrapped_key,
  });

  if (insertError) {
    return json({ erro: "Não foi possível guardar o voto protegido." }, 500);
  }

  return json({ id: aad.recordId }, 201);
}
