import type { PublicRsaJwk } from "@/types";
import { timingSafeEqualString, toHex } from "@/lib/crypto/bytes";
import { SigiloCryptoError } from "@/lib/crypto/errors";

/** JSON estável da chave pública. Campos extras não entram na impressão. */
export function canonicalPublicJwk(jwk: PublicRsaJwk): string {
  return JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
}

export async function fingerprintPublicKey(jwk: PublicRsaJwk): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalPublicJwk(jwk)));
  return toHex(new Uint8Array(digest));
}

/**
 * Compara a impressão local com a cópia vinda do servidor.
 * Se divergir, o chamador não pode embrulhar o voto.
 */
export function assertSamePublicKey(localSha256: string, serverSha256: string): void {
  if (!timingSafeEqualString(localSha256, serverSha256)) {
    throw new SigiloCryptoError("A chave pública local não confere com a cópia do servidor.");
  }
}
