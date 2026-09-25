import type { KeyBackupEnvelope, PublicRsaJwk } from "@/types";
import { toArrayBuffer, wipe } from "@/lib/crypto/bytes";
import { PBKDF2_ITERATIONS, PBKDF2_SALT_BYTES, RECOVERY_CODE_BYTES, RSA_MODULUS_BITS } from "@/lib/crypto/envelopes";
import { SigiloCryptoError } from "@/lib/crypto/errors";
import { openPkcs8 } from "@/lib/crypto/decrypt";
import { sealPkcs8 } from "@/lib/crypto/encrypt";
import { fingerprintPublicKey } from "@/lib/crypto/fingerprint";
import { deriveKekInWorker } from "@/lib/crypto/kdf";
import { senhaSigiloSchema } from "@/lib/validators/sigilo";

export interface SigiloMaterial {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicJwk: PublicRsaJwk;
  publicKeySha256: string;
  backup: KeyBackupEnvelope;
  recoveryBackup: KeyBackupEnvelope;
  /** Exibir uma vez e descartar. Não gravar. */
  recoveryCode: string;
}

/**
 * Gera o par RSA-OAEP 2048 extraível só o tempo de exportar o PKCS#8.
 * Em seguida a sessão fica com a chave privada não extraível, uso unwrapKey,
 * e a pública com uso wrapKey.
 */
export async function generateExtractableRsa(): Promise<{ publicJwk: PublicRsaJwk; pkcs8: Uint8Array }> {
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: RSA_MODULUS_BITS,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["wrapKey", "unwrapKey"],
  );

  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const exported = await crypto.subtle.exportKey("jwk", pair.publicKey);
  if (exported.kty !== "RSA" || !exported.n || !exported.e) {
    wipe(pkcs8);
    throw new SigiloCryptoError("Não foi possível gerar a chave pública.");
  }
  return {
    publicJwk: { kty: "RSA", n: exported.n, e: exported.e, alg: "RSA-OAEP-256" },
    pkcs8,
  };
}

export async function importSessionPrivateKey(pkcs8: Uint8Array): Promise<CryptoKey> {
  const raw = toArrayBuffer(pkcs8);
  try {
    return await crypto.subtle.importKey("pkcs8", raw, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["unwrapKey"]);
  } finally {
    new Uint8Array(raw).fill(0);
  }
}

/** Abre o backup e devolve a chave de sessão, apagando o PKCS#8 em claro. */
export async function openPrivateKey(envelope: unknown, secret: string): Promise<CryptoKey> {
  const pkcs8 = await openPkcs8(envelope, secret);
  try {
    return await importSessionPrivateKey(pkcs8);
  } finally {
    wipe(pkcs8);
  }
}

export async function importWrapPublicKey(jwk: PublicRsaJwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RSA-OAEP-256", ext: true, key_ops: ["wrapKey"] },
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["wrapKey"],
  );
}

function generateRecoveryCode(): { code: string; bytes: Uint8Array } {
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_CODE_BYTES));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const code = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return { code, bytes };
}

/**
 * Cria o material de sigilo. `iterations` existe para o teste injetar
 * um número menor; omitir usa 600_000 na senha e no código de recuperação.
 * Em produção, um valor abaixo disso é recusado.
 */
export async function createSigiloKeys(password: string, iterations: number = PBKDF2_ITERATIONS): Promise<SigiloMaterial> {
  if (!senhaSigiloSchema.safeParse(password).success) {
    throw new SigiloCryptoError("A senha de sigilo precisa ter pelo menos 12 caracteres.");
  }
  if (process.env.NODE_ENV === "production" && iterations < PBKDF2_ITERATIONS) {
    throw new SigiloCryptoError("A derivação em produção exige 600000 iterações.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  const kek = await deriveKekInWorker(password, salt, iterations);
  const generated = await generateExtractableRsa();

  try {
    const backup = await sealPkcs8({
      pkcs8: generated.pkcs8,
      kek,
      publicJwk: generated.publicJwk,
      iterations,
      salt,
    });

    const recovery = generateRecoveryCode();
    const recoverySalt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
    try {
      const recoveryKek = await deriveKekInWorker(recovery.code, recoverySalt, iterations);
      const recoveryBackup = await sealPkcs8({
        pkcs8: generated.pkcs8,
        kek: recoveryKek,
        publicJwk: generated.publicJwk,
        iterations,
        salt: recoverySalt,
      });
      const privateKey = await importSessionPrivateKey(generated.pkcs8);
      const publicKey = await importWrapPublicKey(generated.publicJwk);
      const publicKeySha256 = await fingerprintPublicKey(generated.publicJwk);
      return {
        publicKey,
        privateKey,
        publicJwk: generated.publicJwk,
        publicKeySha256,
        backup,
        recoveryBackup,
        recoveryCode: recovery.code,
      };
    } finally {
      wipe(recovery.bytes);
    }
  } finally {
    wipe(generated.pkcs8);
  }
}
