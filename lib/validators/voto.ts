import { z } from "zod";

const CAMPOS_PROIBIDOS = new Set(["politico_id", "cargo", "turno", "ano_eleicao", "plaintext"]);

/**
 * Payload em claro. Usar só no navegador, antes de cifrar.
 * Não enviar este objeto ao servidor.
 */
export const votoPayloadSchema = z.strictObject({
  politico_id: z.string().min(1),
  ano_eleicao: z.number().int(),
  turno: z.union([z.literal(1), z.literal(2)]),
  cargo: z.string().min(1),
});

const base64Url = z.string().regex(/^[A-Za-z0-9_-]+$/);

/**
 * Envelope que o servidor pode aceitar. Campo extra, inclusive
 * politico_id no topo, é recusado.
 */
export const envelopeVotoSchema = z.strictObject({
  v: z.literal(1),
  alg: z.literal("RSA-OAEP-256+A256GCM"),
  ct: base64Url.min(1),
  iv: base64Url.min(1),
  wrapped_key: base64Url.min(1),
  aad: z.string().regex(/^mc-voto-v1\|[^|]+\|[^|]+$/),
});

/** Percorre o JSON e recusa voto em claro em qualquer nível. */
export function contemCampoDeVotoEmClaro(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => contemCampoDeVotoEmClaro(item));
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      if (CAMPOS_PROIBIDOS.has(key) || contemCampoDeVotoEmClaro(child)) {
        return true;
      }
    }
  }
  return false;
}
