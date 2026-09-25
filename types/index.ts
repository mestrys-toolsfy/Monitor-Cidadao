/**
 * Tipos globais da Fase 1.
 * O voto em claro só existe nestes tipos no navegador, antes de ser cifrado.
 */

export interface PublicRsaJwk {
  kty: "RSA";
  n: string;
  e: string;
  alg: "RSA-OAEP-256";
}

export interface KeyBackupKdf {
  name: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  salt: string;
}

export interface KeyBackupCipher {
  name: "AES-GCM";
  iv: string;
  tagLength: 128;
}

/** Backup da chave privada. O campo `ct` é o PKCS#8 já cifrado. */
export interface KeyBackupEnvelope {
  v: 1;
  alg: "PBKDF2-SHA256+A256GCM";
  kdf: KeyBackupKdf;
  cipher: KeyBackupCipher;
  ct: string;
  public_key_jwk: PublicRsaJwk;
  created_at: string;
}

/** Voto cifrado. Não carrega cargo, turno nem identificador em claro. */
export interface VoteEnvelope {
  v: 1;
  alg: "RSA-OAEP-256+A256GCM";
  ct: string;
  iv: string;
  wrapped_key: string;
  aad: string;
}

export interface VotoPayload {
  politico_id: string;
  ano_eleicao: number;
  turno: 1 | 2;
  cargo: string;
}

export interface Profile {
  id: string;
  public_key_jwk: PublicRsaJwk | null;
  public_key_sha256: string | null;
  privkey_backup_blob: KeyBackupEnvelope | null;
  recovery_backup_blob: KeyBackupEnvelope | null;
  sigilo_opt_in: boolean;
  sigilo_consent_at: string | null;
  created_at: string;
  updated_at: string;
}
