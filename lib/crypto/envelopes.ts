import type { KeyBackupEnvelope, PublicRsaJwk, VoteEnvelope } from "@/types";
import { fromBase64Url } from "@/lib/crypto/bytes";
import { SigiloCryptoError } from "@/lib/crypto/errors";

/** Iterações de produção. Testes podem injetar outro valor; o padrão não muda. */
export const PBKDF2_ITERATIONS = 600_000;

export const PBKDF2_SALT_BYTES = 16;
export const AES_GCM_IV_BYTES = 12;
export const AES_GCM_TAG_BITS = 128;
export const RECOVERY_CODE_BYTES = 16;
export const RSA_MODULUS_BITS = 2048;
export const PBKDF2_ITERATIONS_MAX = 2_000_000;

export const KEY_BACKUP_ALG = "PBKDF2-SHA256+A256GCM" as const;
export const VOTE_ALG = "RSA-OAEP-256+A256GCM" as const;

const KEY_BACKUP_FIELDS = ["v", "alg", "kdf", "cipher", "ct", "public_key_jwk", "created_at"] as const;
const VOTE_FIELDS = ["v", "alg", "ct", "iv", "wrapped_key", "aad"] as const;
const PUBLIC_JWK_FIELDS = ["kty", "n", "e", "alg"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new SigiloCryptoError("Envelope com campo não reconhecido.");
    }
  }
}

function assertBase64Url(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new SigiloCryptoError(`${label} inválido.`);
  }
  return value;
}

function decodeFixed(value: string, size: number, label: string): void {
  const bytes = fromBase64Url(value);
  if (bytes.byteLength !== size) {
    throw new SigiloCryptoError(`${label} com tamanho inesperado.`);
  }
}

/**
 * AAD canônico do voto. Os identificadores não podem conter "|",
 * senão a separação deixa de ser única.
 */
export function canonicalVoteAad(userId: string, recordId: string): string {
  if (!userId || !recordId || userId.includes("|") || recordId.includes("|")) {
    throw new SigiloCryptoError("Identificadores inválidos para o voto protegido.");
  }
  return `mc-voto-v1|${userId}|${recordId}`;
}

export function parseVoteAad(aad: string): { userId: string; recordId: string } {
  const parts = aad.split("|");
  if (parts.length !== 3 || parts[0] !== "mc-voto-v1" || !parts[1] || !parts[2]) {
    throw new SigiloCryptoError("AAD do voto inválido.");
  }
  return { userId: parts[1], recordId: parts[2] };
}

function parsePublicJwk(value: unknown): PublicRsaJwk {
  if (!isRecord(value)) {
    throw new SigiloCryptoError("Chave pública ausente no envelope.");
  }
  if ("d" in value || "p" in value || "q" in value || "dp" in value || "dq" in value || "qi" in value) {
    throw new SigiloCryptoError("O envelope não pode carregar chave privada em claro.");
  }
  assertExactKeys(value, PUBLIC_JWK_FIELDS);
  if (value.kty !== "RSA" || typeof value.n !== "string" || typeof value.e !== "string" || !value.n || !value.e) {
    throw new SigiloCryptoError("Chave pública RSA inválida.");
  }
  if (value.alg !== undefined && value.alg !== "RSA-OAEP-256") {
    throw new SigiloCryptoError("Algoritmo da chave pública inválido.");
  }
  return { kty: "RSA", n: value.n, e: value.e, alg: "RSA-OAEP-256" };
}

/**
 * Recusa versão desconhecida e qualquer campo fora do formato v1.
 * O PKCS#8 em claro nunca passa por aqui: só o `ct` cifrado.
 */
export function parseKeyBackup(input: unknown): KeyBackupEnvelope {
  if (!isRecord(input)) {
    throw new SigiloCryptoError("Envelope de chave inválido.");
  }
  if (input.v !== 1) {
    throw new SigiloCryptoError("Versão de envelope desconhecida.");
  }
  assertExactKeys(input, KEY_BACKUP_FIELDS);
  if (input.alg !== KEY_BACKUP_ALG) {
    throw new SigiloCryptoError("Algoritmo do backup de chave inválido.");
  }
  if (!isRecord(input.kdf) || !isRecord(input.cipher)) {
    throw new SigiloCryptoError("Parâmetros do backup de chave inválidos.");
  }
  assertExactKeys(input.kdf, ["name", "hash", "iterations", "salt"]);
  assertExactKeys(input.cipher, ["name", "iv", "tagLength"]);
  if (input.kdf.name !== "PBKDF2" || input.kdf.hash !== "SHA-256") {
    throw new SigiloCryptoError("KDF do backup de chave inválido.");
  }
  if (
    typeof input.kdf.iterations !== "number" ||
    !Number.isInteger(input.kdf.iterations) ||
    input.kdf.iterations < 1 ||
    input.kdf.iterations > PBKDF2_ITERATIONS_MAX
  ) {
    throw new SigiloCryptoError("Iterações do backup de chave inválidas.");
  }
  if (typeof input.kdf.salt !== "string") {
    throw new SigiloCryptoError("Salt do backup de chave inválido.");
  }
  decodeFixed(input.kdf.salt, PBKDF2_SALT_BYTES, "Salt");
  if (input.cipher.name !== "AES-GCM" || input.cipher.tagLength !== AES_GCM_TAG_BITS) {
    throw new SigiloCryptoError("Cifra do backup de chave inválida.");
  }
  if (typeof input.cipher.iv !== "string") {
    throw new SigiloCryptoError("IV do backup de chave inválido.");
  }
  decodeFixed(input.cipher.iv, AES_GCM_IV_BYTES, "IV");
  const ct = assertBase64Url(input.ct, "Ciphertext");
  if (typeof input.created_at !== "string" || Number.isNaN(Date.parse(input.created_at))) {
    throw new SigiloCryptoError("Data do backup de chave inválida.");
  }
  return {
    v: 1,
    alg: KEY_BACKUP_ALG,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: input.kdf.iterations,
      salt: input.kdf.salt,
    },
    cipher: {
      name: "AES-GCM",
      iv: input.cipher.iv,
      tagLength: AES_GCM_TAG_BITS,
    },
    ct,
    public_key_jwk: parsePublicJwk(input.public_key_jwk),
    created_at: input.created_at,
  };
}

/** Recusa versão desconhecida e campos de voto em claro no envelope. */
export function parseVoteEnvelope(input: unknown): VoteEnvelope {
  if (!isRecord(input)) {
    throw new SigiloCryptoError("Envelope de voto inválido.");
  }
  if (input.v !== 1) {
    throw new SigiloCryptoError("Versão de envelope desconhecida.");
  }
  assertExactKeys(input, VOTE_FIELDS);
  if (input.alg !== VOTE_ALG) {
    throw new SigiloCryptoError("Algoritmo do voto inválido.");
  }
  const ct = assertBase64Url(input.ct, "Ciphertext");
  const iv = assertBase64Url(input.iv, "IV");
  const wrapped = assertBase64Url(input.wrapped_key, "Chave embrulhada");
  decodeFixed(iv, AES_GCM_IV_BYTES, "IV");
  if (typeof input.aad !== "string") {
    throw new SigiloCryptoError("AAD do voto inválido.");
  }
  parseVoteAad(input.aad);
  return {
    v: 1,
    alg: VOTE_ALG,
    ct,
    iv,
    wrapped_key: wrapped,
    aad: input.aad,
  };
}
