import type { KeyBackupEnvelope, VoteEnvelope, VotoPayload } from "@/types";
import { fromBase64Url, timingSafeEqualString, toArrayBuffer, wipe } from "@/lib/crypto/bytes";
import { AES_GCM_TAG_BITS, canonicalVoteAad, parseKeyBackup, parseVoteEnvelope } from "@/lib/crypto/envelopes";
import { SigiloCryptoError } from "@/lib/crypto/errors";
import { deriveKekInWorker } from "@/lib/crypto/kdf";
import { votoPayloadSchema } from "@/lib/validators/voto";

async function decryptAesGcm(params: {
  key: CryptoKey;
  iv: Uint8Array;
  ciphertext: Uint8Array;
  aad?: Uint8Array;
}): Promise<Uint8Array> {
  try {
    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(params.iv),
        tagLength: AES_GCM_TAG_BITS,
        ...(params.aad ? { additionalData: toArrayBuffer(params.aad) } : {}),
      },
      params.key,
      toArrayBuffer(params.ciphertext),
    );
    return new Uint8Array(plain);
  } catch {
    throw new SigiloCryptoError("Não foi possível abrir o sigilo.");
  }
}

/** Abre o PKCS#8 cifrado. Senha errada ou tag adulterada falham igual. */
export async function openPkcs8(envelopeInput: unknown, secret: string): Promise<Uint8Array> {
  const envelope: KeyBackupEnvelope = parseKeyBackup(envelopeInput);
  const kek = await deriveKekInWorker(secret, fromBase64Url(envelope.kdf.salt), envelope.kdf.iterations);
  return decryptAesGcm({
    key: kek,
    iv: fromBase64Url(envelope.cipher.iv),
    ciphertext: fromBase64Url(envelope.ct),
  });
}

/**
 * Abre o voto. O AAD é recalculado com o usuário e o registro informados.
 * Outro usuário, outra tag ou outro registro falham sem revelar o conteúdo.
 */
export async function decryptVote(params: {
  envelope: unknown;
  privateKey: CryptoKey;
  userId: string;
  recordId: string;
}): Promise<VotoPayload> {
  const envelope: VoteEnvelope = parseVoteEnvelope(params.envelope);
  const expectedAad = canonicalVoteAad(params.userId, params.recordId);
  if (!timingSafeEqualString(envelope.aad, expectedAad)) {
    throw new SigiloCryptoError("Não foi possível abrir o voto protegido.");
  }

  let aesKey: CryptoKey;
  try {
    aesKey = await crypto.subtle.unwrapKey(
      "raw",
      toArrayBuffer(fromBase64Url(envelope.wrapped_key)),
      params.privateKey,
      { name: "RSA-OAEP" },
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
  } catch {
    throw new SigiloCryptoError("Não foi possível abrir o voto protegido.");
  }

  const plain = await decryptAesGcm({
    key: aesKey,
    iv: fromBase64Url(envelope.iv),
    ciphertext: fromBase64Url(envelope.ct),
    aad: new TextEncoder().encode(expectedAad),
  });

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(plain));
    const result = votoPayloadSchema.safeParse(parsed);
    if (!result.success) {
      throw new SigiloCryptoError("Não foi possível abrir o voto protegido.");
    }
    return result.data;
  } catch (error) {
    if (error instanceof SigiloCryptoError) throw error;
    throw new SigiloCryptoError("Não foi possível abrir o voto protegido.");
  } finally {
    wipe(plain);
  }
}
