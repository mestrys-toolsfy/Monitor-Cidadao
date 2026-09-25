import { PBKDF2_ITERATIONS } from "@/lib/crypto/envelopes";
import { deriveKek } from "@/lib/crypto/kdf-core";

export { deriveKek } from "@/lib/crypto/kdf-core";

/**
 * Usa o worker só no navegador. Fora dele, chama a derivação pura
 * para o teste Node não depender de empacotar o worker.
 */
export async function deriveKekInWorker(
  secret: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return deriveKek(secret, salt, iterations);
  }
  const { deriveKekWithBrowserWorker } = await import("@/lib/crypto/kdf-browser");
  return deriveKekWithBrowserWorker(secret, salt, iterations);
}
