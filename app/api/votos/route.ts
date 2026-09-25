import { NextResponse } from "next/server";
import { fromBase64Url, toBase64Url } from "@/lib/crypto/bytes";
import { canonicalVoteAad, parseVoteAad, parseVoteEnvelope } from "@/lib/crypto/envelopes";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { contemCampoDeVotoEmClaro, envelopeVotoSchema } from "@/lib/validators/voto";
import { z } from "zod";

export const dynamic = "force-dynamic";

function json(body: { erro: string } | { id: string }, status: number) {
  return NextResponse.json(body, { status });
}

/** Hex com prefixo \\x, formato que o PostgREST grava em bytea. */
function paraBytea(bytes: Uint8Array): string {
  let hex = "\\x";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
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

  let ciphertext: string;
  let iv: string;
  let wrappedKey: string;
  try {
    const ivBytes = fromBase64Url(parsed.data.iv);
    if (ivBytes.byteLength !== 12) {
      return json({ erro: "Envelope de voto inválido." }, 400);
    }
    ciphertext = paraBytea(fromBase64Url(parsed.data.ct));
    iv = paraBytea(ivBytes);
    wrappedKey = paraBytea(fromBase64Url(parsed.data.wrapped_key));
  } catch {
    return json({ erro: "Envelope de voto inválido." }, 400);
  }

  const { error: insertError } = await supabase.from("votos_cifrados").insert({
    id: aad.recordId,
    user_id: data.user.id,
    schema_version: parsed.data.v,
    alg: parsed.data.alg,
    ciphertext,
    iv,
    wrapped_key: wrappedKey,
  });

  if (insertError) {
    return json({ erro: "Não foi possível guardar o voto protegido." }, 500);
  }

  return json({ id: aad.recordId }, 201);
}

function deBytea(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (typeof value !== "string" || !value.startsWith("\\x")) {
    throw new Error("bytea");
  }
  const hex = value.slice(2);
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error("bytea");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Devolve só envelopes cifrados da conta. O conteúdo do voto não sai daqui.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return json({ erro: "A persistência do voto protegido ainda não está configurada." }, 501);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return json({ erro: "É preciso entrar na conta para ler os votos protegidos." }, 401);
  }

  const { data: linhas, error: selectError } = await supabase
    .from("votos_cifrados")
    .select("id, schema_version, alg, ciphertext, iv, wrapped_key")
    .eq("user_id", data.user.id);

  if (selectError || !linhas) {
    return json({ erro: "Não foi possível ler os votos protegidos." }, 500);
  }

  try {
    const itens = linhas.map((linha) => {
      const envelope = parseVoteEnvelope({
        v: linha.schema_version,
        alg: linha.alg,
        ct: toBase64Url(deBytea(linha.ciphertext)),
        iv: toBase64Url(deBytea(linha.iv)),
        wrapped_key: toBase64Url(deBytea(linha.wrapped_key)),
        aad: canonicalVoteAad(data.user.id, linha.id),
      });
      return { id: linha.id, envelope };
    });
    return NextResponse.json({ itens });
  } catch {
    return json({ erro: "Não foi possível ler os votos protegidos." }, 500);
  }
}
