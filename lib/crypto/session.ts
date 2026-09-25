import type { PublicRsaJwk } from "@/types";

/**
 * Sessão desbloqueada fora do React.
 * CryptoKey e JWK público ficam numa variável de módulo. `relock` solta
 * a referência para o coletor de lixo. A senha nunca entra aqui.
 */
export interface UnlockedSigilo {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: PublicRsaJwk;
  publicKeySha256: string;
}

let unlocked: UnlockedSigilo | null = null;

export function unlockSession(material: UnlockedSigilo): void {
  unlocked = material;
}

export function readSession(): UnlockedSigilo | null {
  return unlocked;
}

export function relock(): void {
  unlocked = null;
}
