"use client";

/**
 * Laboratório manual da Fase 1. Não é tela de produto.
 * O voto de exemplo é protegido neste navegador e não é enviado a lugar nenhum.
 * A senha fica só no campo (não entra em estado). A chave fica no módulo de sessão.
 */

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { decryptVote } from "@/lib/crypto/decrypt";
import { encryptVote } from "@/lib/crypto/encrypt";
import { createSigiloKeys, openPrivateKey } from "@/lib/crypto/keypair";
import { relock, unlockSession } from "@/lib/crypto/session";
import { useLabUiStore } from "@/lib/ui/lab-store";
import { senhaSigiloSchema } from "@/lib/validators/sigilo";
import type { KeyBackupEnvelope, VotoPayload } from "@/types";

const VOTO_EXEMPLO: VotoPayload = {
  politico_id: "fixture",
  ano_eleicao: 2026,
  turno: 1,
  cargo: "deputado_federal",
};

const USUARIO_LOCAL = "laboratorio-local";

function truncar(valor: string): string {
  if (valor.length <= 24) return valor;
  return `${valor.slice(0, 24)}…`;
}

function cargoLegivel(cargo: string): string {
  if (cargo === "deputado_federal") return "Deputado federal";
  return cargo;
}

export default function SigiloLabPage() {
  const senhaRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<KeyBackupEnvelope | null>(null);
  const [cifrado, setCifrado] = useState<string | null>(null);
  const [aberto, setAberto] = useState<VotoPayload | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const etapa = useLabUiStore((state) => state.etapa);
  const mensagem = useLabUiStore((state) => state.mensagem);
  const definir = useLabUiStore((state) => state.definir);

  useEffect(() => {
    return () => {
      relock();
    };
  }, []);

  async function proteger() {
    const senha = senhaRef.current?.value ?? "";
    if (!senhaSigiloSchema.safeParse(senha).success) {
      definir("falha", "A senha de sigilo precisa ter pelo menos 12 caracteres. Ela não é a senha da conta.");
      return;
    }

    definir("trabalhando", "Protegendo o voto de exemplo neste aparelho. Isso pode levar alguns segundos.");
    try {
      const material = await createSigiloKeys(senha);
      if (senhaRef.current) senhaRef.current.value = "";

      unlockSession({
        privateKey: material.privateKey,
        publicKey: material.publicKey,
        publicJwk: material.publicJwk,
        publicKeySha256: material.publicKeySha256,
      });

      const registro = crypto.randomUUID();
      const envelope = await encryptVote({
        payload: VOTO_EXEMPLO,
        publicKey: material.publicKey,
        localPublicSha256: material.publicKeySha256,
        serverPublicSha256: material.publicKeySha256,
        userId: USUARIO_LOCAL,
        recordId: registro,
      });
      const resultado = await decryptVote({
        envelope,
        privateKey: material.privateKey,
        userId: USUARIO_LOCAL,
        recordId: registro,
      });

      backupRef.current = material.backup;
      setCodigo(material.recoveryCode);
      setCifrado(truncar(envelope.ct));
      setAberto(resultado);

      const [{ salvarChaveSigilo }, { getOrCreateDeviceId }] = await Promise.all([
        import("@/lib/storage/db"),
        import("@/lib/storage/kv"),
      ]);
      const deviceId = await getOrCreateDeviceId();
      await salvarChaveSigilo({
        id: deviceId,
        privkey_blob: material.backup,
        iv: material.backup.cipher.iv,
        salt: material.backup.kdf.salt,
        created_at: material.backup.created_at,
        device_id: deviceId,
        public_key_sha256: material.publicKeySha256,
        recovery_blob: material.recoveryBackup,
      });

      definir("pronto", "O voto de exemplo foi protegido e aberto de novo neste aparelho. Nada foi enviado.");
    } catch {
      relock();
      backupRef.current = null;
      setCifrado(null);
      setAberto(null);
      setCodigo(null);
      definir("falha", "Não foi possível proteger o voto de exemplo.");
    }
  }

  async function senhaErrada() {
    const backup = backupRef.current;
    if (!backup) {
      definir("falha", "Primeiro proteja o voto de exemplo.");
      return;
    }
    definir("trabalhando", "Tentando abrir a chave com uma senha que não é a sua.");
    try {
      await openPrivateKey(backup, "senha-errada-laboratorio");
      definir("falha", "A senha errada não deveria abrir a chave.");
    } catch {
      definir("falha", "A senha não abriu a chave. O voto de exemplo continua protegido.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      <Link
        className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full border border-tertiary bg-tertiary-container px-4 text-sm font-semibold text-on-tertiary-container"
        href="/privacidade"
      >
        <ShieldCheck aria-hidden="true" className="size-5" />
        Dado sensível · LGPD
      </Link>

      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-2xl font-semibold leading-8 text-on-surface">Verificação do sigilo</h1>
        <p className="text-base leading-6 text-on-surface">
          Esta tela só existe para conferir a proteção do voto. Ela não é a tela que a pessoa cidadã vai usar no dia a
          dia. A senha de sigilo é diferente da senha de entrada e não sai deste navegador.
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-xl bg-surface-container-lowest p-4">
        <label className="text-sm font-semibold text-on-surface" htmlFor="senha-sigilo">
          Senha de sigilo
        </label>
        <input
          id="senha-sigilo"
          ref={senhaRef}
          type="password"
          autoComplete="new-password"
          minLength={12}
          className="min-h-12 rounded border border-outline bg-surface px-3 text-on-surface"
          placeholder="Pelo menos 12 caracteres"
        />
        <p className="text-sm leading-5 text-on-surface-variant">
          Use uma frase que só você saiba. Ela não é enviada para a empresa.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button disabled={etapa === "trabalhando"} onClick={() => void proteger()}>
            Proteger voto de exemplo
          </Button>
          <Button variant="outlined" disabled={etapa === "trabalhando"} onClick={() => void senhaErrada()}>
            Tentar com senha errada
          </Button>
        </div>
      </div>

      <p className="min-h-6 text-base text-on-surface" role="status">
        {mensagem}
      </p>

      {codigo ? (
        <section className="flex max-w-xl flex-col gap-3 rounded-xl border border-outline bg-surface-container-low p-4">
          <h2 className="text-lg font-semibold text-on-surface">Código de recuperação</h2>
          <p className="text-sm leading-5 text-on-surface">
            Anote agora. Ele aparece uma vez, não fica salvo e não será mostrado de novo.
          </p>
          <p className="break-all font-semibold text-on-surface">{codigo}</p>
          <Button variant="outlined" onClick={() => setCodigo(null)}>
            Já anotei, apagar da tela
          </Button>
        </section>
      ) : null}

      {cifrado ? (
        <section className="flex max-w-xl flex-col gap-2">
          <h2 className="text-lg font-semibold text-on-surface">Texto protegido</h2>
          <p className="break-all text-sm text-on-surface-variant">{cifrado}</p>
        </section>
      ) : null}

      {aberto ? (
        <section className="max-w-xl">
          <h2 className="mb-2 text-lg font-semibold text-on-surface">Voto de exemplo aberto de novo</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-on-surface-variant">Pessoa de exemplo</dt>
              <dd className="font-semibold text-on-surface">{aberto.politico_id}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Ano da eleição</dt>
              <dd className="font-semibold text-on-surface">{aberto.ano_eleicao}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Turno</dt>
              <dd className="font-semibold text-on-surface">{aberto.turno}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Cargo</dt>
              <dd className="font-semibold text-on-surface">{cargoLegivel(aberto.cargo)}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </main>
  );
}
