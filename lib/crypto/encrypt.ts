import type { KeyBackupEnvelope, PublicRsaJwk, VoteEnvelope, VotoPayload } from "@/types";
import { toArrayBuffer, toBase64Url } from "@/lib/crypto/bytes";
import {
  AES_GCM_IV_BYTES,
  AES_GCM_TAG_BITS,
  KEY_BACKUP_ALG,
  VOTE_ALG,
  canonicalVoteAad,
  parseKeyBackup,
  parseVoteEnvelope,
} from "@/lib/crypto/envelopes";
import { SigiloCryptoError } from "@/lib/crypto/errors";
import { assertSamePublicKey } from "@/lib/crypto/fingerprint";

function randomIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
}

/**
 * Cifra o PKCS#8 com a KEK já derivada. O envelope guarda salt e iterações
 * para abrir depois, sem guardar a senha.
 */
export async function sealPkcs8(params: {
  pkcs8: Uint8Array;
  kek: CryptoKey;
  publicJwk: PublicRsaJwk;
  iterations: number;
  salt: Uint8Array;
}): Promise<KeyBackupEnvelope> {
  const iv = randomIv();
  let ciphertext: ArrayBuffer;
  try {
    ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv), tagLength: AES_GCM_TAG_BITS },
      params.kek,
      toArrayBuffer(params.pkcs8),
    );
  } catch {
    throw new SigiloCryptoError("Não foi possível proteger a chave.");
  }

  return parseKeyBackup({
    v: 1,
    alg: KEY_BACKUP_ALG,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: params.iterations,
      salt: toBase64Url(params.salt),
    },
    cipher: {
      name: "AES-GCM",
      iv: toBase64Url(iv),
      tagLength: AES_GCM_TAG_BITS,
    },
    ct: toBase64Url(new Uint8Array(ciphertext)),
    public_key_jwk: params.publicJwk,
    created_at: new Date().toISOString(),
  });
}

/**
 * Protege o voto com AES-GCM e embrulha a chave AES na chave pública local.
 * Recusa o embrulho se a impressão local divergir da cópia do servidor.
 */
export async function encryptVote(params: {
  payload: VotoPayload;
  publicKey: CryptoKey;
  localPublicSha256: string;
  serverPublicSha256: string;
  userId: string;
  recordId: string;
}): Promise<VoteEnvelope> {
  assertSamePublicKey(params.localPublicSha256, params.serverPublicSha256);

  const aad = canonicalVoteAad(params.userId, params.recordId);
  const iv = randomIv();
  const plaintext = new TextEncoder().encode(
    JSON.stringify({
      politico_id: params.payload.politico_id,
      ano_eleicao: params.payload.ano_eleicao,
      turno: params.payload.turno,
      cargo: params.payload.cargo,
    }),
  );

  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  let ciphertext: ArrayBuffer;
  let wrapped: ArrayBuffer;
  try {
    ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
        additionalData: new TextEncoder().encode(aad),
        tagLength: AES_GCM_TAG_BITS,
      },
      aesKey,
      toArrayBuffer(plaintext),
    );
    wrapped = await crypto.subtle.wrapKey("raw", aesKey, params.publicKey, { name: "RSA-OAEP" });
  } catch {
    throw new SigiloCryptoError("Não foi possível proteger o voto.");
  } finally {
    plaintext.fill(0);
  }

  return parseVoteEnvelope({
    v: 1,
    alg: VOTE_ALG,
    ct: toBase64Url(new Uint8Array(ciphertext)),
    iv: toBase64Url(iv),
    wrapped_key: toBase64Url(new Uint8Array(wrapped)),
    aad,
  });
}
