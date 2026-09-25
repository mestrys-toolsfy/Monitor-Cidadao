import { describe, expect, it } from "vitest";
import { toBase64Url, fromBase64Url } from "@/lib/crypto/bytes";
import { decryptVote, openPkcs8 } from "@/lib/crypto/decrypt";
import { encryptVote, sealPkcs8 } from "@/lib/crypto/encrypt";
import { PBKDF2_ITERATIONS, parseVoteEnvelope } from "@/lib/crypto/envelopes";
import { createSigiloKeys, openPrivateKey } from "@/lib/crypto/keypair";
import { deriveKek } from "@/lib/crypto/kdf";
import { envelopeVotoSchema } from "@/lib/validators/voto";
import type { PublicRsaJwk, VotoPayload } from "@/types";

const PAYLOAD: VotoPayload = {
  politico_id: "fixture",
  ano_eleicao: 2026,
  turno: 1,
  cargo: "deputado_federal",
};

const SENHA = "senha-de-sigilo-teste";
const USUARIO = "usuario-lab";
const REGISTRO = "registro-lab";

const JWK_FICTICIO: PublicRsaJwk = {
  kty: "RSA",
  n: "AQ",
  e: "AQAB",
  alg: "RSA-OAEP-256",
};

describe("sigilo do voto", () => {
  it("usa 600000 iterações como padrão de produção", () => {
    expect(PBKDF2_ITERATIONS).toBe(600_000);
  });

  it("cifra e decifra o voto de exemplo", async () => {
    const material = await createSigiloKeys(SENHA, 1_000);
    expect(material.backup.kdf.iterations).toBe(1_000);
    expect(material.recoveryBackup.kdf.iterations).toBe(1_000);
    expect(material.privateKey.extractable).toBe(false);
    expect([...material.privateKey.usages]).toEqual(["unwrapKey"]);
    expect([...material.publicKey.usages]).toEqual(["wrapKey"]);

    const envelope = await encryptVote({
      payload: PAYLOAD,
      publicKey: material.publicKey,
      localPublicSha256: material.publicKeySha256,
      serverPublicSha256: material.publicKeySha256,
      userId: USUARIO,
      recordId: REGISTRO,
    });

    const serializado = JSON.stringify(envelope);
    expect(serializado.includes("politico_id")).toBe(false);
    expect(serializado.includes("fixture")).toBe(false);
    expect(serializado.includes("deputado_federal")).toBe(false);

    const aberto = await decryptVote({
      envelope,
      privateKey: material.privateKey,
      userId: USUARIO,
      recordId: REGISTRO,
    });
    expect(aberto).toEqual(PAYLOAD);

    const reaberta = await openPrivateKey(material.backup, SENHA);
    const deNovo = await decryptVote({
      envelope,
      privateKey: reaberta,
      userId: USUARIO,
      recordId: REGISTRO,
    });
    expect(deNovo).toEqual(PAYLOAD);

    const pelaRecuperacao = await openPrivateKey(material.recoveryBackup, material.recoveryCode);
    const viaCodigo = await decryptVote({
      envelope,
      privateKey: pelaRecuperacao,
      userId: USUARIO,
      recordId: REGISTRO,
    });
    expect(viaCodigo).toEqual(PAYLOAD);
  });

  it("falha com senha errada", async () => {
    const material = await createSigiloKeys(SENHA, 1_000);
    await expect(openPrivateKey(material.backup, `${SENHA}-errada`)).rejects.toThrow();
  });

  it("falha com a tag adulterada", async () => {
    const material = await createSigiloKeys(SENHA, 1_000);
    const envelope = await encryptVote({
      payload: PAYLOAD,
      publicKey: material.publicKey,
      localPublicSha256: material.publicKeySha256,
      serverPublicSha256: material.publicKeySha256,
      userId: USUARIO,
      recordId: REGISTRO,
    });
    const ct = fromBase64Url(envelope.ct);
    const ultimo = ct.length - 1;
    ct[ultimo] = (ct[ultimo] ?? 0) ^ 0xff;
    const adulterado = { ...envelope, ct: toBase64Url(ct) };
    await expect(
      decryptVote({
        envelope: adulterado,
        privateKey: material.privateKey,
        userId: USUARIO,
        recordId: REGISTRO,
      }),
    ).rejects.toThrow();
  });

  it("falha com AAD de outro usuário", async () => {
    const material = await createSigiloKeys(SENHA, 1_000);
    const envelope = await encryptVote({
      payload: PAYLOAD,
      publicKey: material.publicKey,
      localPublicSha256: material.publicKeySha256,
      serverPublicSha256: material.publicKeySha256,
      userId: USUARIO,
      recordId: REGISTRO,
    });
    await expect(
      decryptVote({
        envelope,
        privateKey: material.privateKey,
        userId: "outro-usuario",
        recordId: REGISTRO,
      }),
    ).rejects.toThrow();
  });

  it("recusa embrulhar se a chave pública divergir", async () => {
    const material = await createSigiloKeys(SENHA, 1_000);
    await expect(
      encryptVote({
        payload: PAYLOAD,
        publicKey: material.publicKey,
        localPublicSha256: material.publicKeySha256,
        serverPublicSha256: "0".repeat(64),
        userId: USUARIO,
        recordId: REGISTRO,
      }),
    ).rejects.toThrow();
  });

  it("recusa envelope com politico_id no Zod", () => {
    const resultado = envelopeVotoSchema.safeParse({
      v: 1,
      alg: "RSA-OAEP-256+A256GCM",
      ct: "YQ",
      iv: "YQ",
      wrapped_key: "YQ",
      aad: "mc-voto-v1|u|r",
      politico_id: "x",
    });
    expect(resultado.success).toBe(false);
  });

  it("recusa versão desconhecida", () => {
    expect(() =>
      parseVoteEnvelope({
        v: 99,
        alg: "RSA-OAEP-256+A256GCM",
        ct: "YQ",
        iv: "YQ",
        wrapped_key: "YQ",
        aad: "mc-voto-v1|u|r",
      }),
    ).toThrow(/desconhecida/);
  });

  it("faz um roundtrip real com 600000 iterações", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const segredo = "senha-de-sigilo-producao";
    const kek = await deriveKek(segredo, salt);
    expect(kek.extractable).toBe(false);
    const claro = new TextEncoder().encode("pkcs8-falso");
    const envelope = await sealPkcs8({
      pkcs8: claro,
      kek,
      publicJwk: JWK_FICTICIO,
      iterations: PBKDF2_ITERATIONS,
      salt,
    });
    expect(envelope.kdf.iterations).toBe(600_000);
    const aberto = await openPkcs8(envelope, segredo);
    expect(toBase64Url(aberto)).toBe(toBase64Url(claro));
    aberto.fill(0);
  });
});
