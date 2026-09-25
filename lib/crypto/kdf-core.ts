import { toArrayBuffer, wipe } from "@/lib/crypto/bytes";
import { SigiloCryptoError } from "@/lib/crypto/errors";
import { PBKDF2_ITERATIONS, PBKDF2_ITERATIONS_MAX } from "@/lib/crypto/envelopes";

/**
 * Deriva a KEK com PBKDF2-HMAC-SHA-256.
 * A chave resultante não é extraível e só serve para cifrar ou decifrar.
 *
 * No navegador, `deriveKekInWorker` roda esta função em `kdf.worker.ts`
 * para a interface não travar durante as 600 mil iterações. No Vitest,
 * com ambiente Node, os testes chamam `deriveKek` direto. O padrão de
 * produção continua 600_000. Um teste pode passar `iterations` menor;
 * quem omite o argumento usa o padrão.
 *
 * Este arquivo não importa o worker. O worker precisa da derivação pura
 * sem o `import()` de `kdf-browser`: esse ciclo de chunks faz o
 * `next build` do Turbopack esperar para sempre, sem mensagem de erro.
 */
export async function deriveKek(
  secret: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS_MAX) {
    throw new SigiloCryptoError("Iterações do PBKDF2 inválidas.");
  }
  if (salt.byteLength !== 16) {
    throw new SigiloCryptoError("Salt do PBKDF2 inválido.");
  }

  const encoded = new TextEncoder().encode(secret);
  const raw = toArrayBuffer(encoded);
  wipe(encoded);

  let material: CryptoKey;
  try {
    material = await crypto.subtle.importKey("raw", raw, "PBKDF2", false, ["deriveKey"]);
  } finally {
    new Uint8Array(raw).fill(0);
  }

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
