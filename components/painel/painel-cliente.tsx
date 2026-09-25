"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { descreverEscolha } from "@/lib/civic/escolha";
import { rotuloCargo } from "@/lib/civic/linguagem";
import { decryptVote } from "@/lib/crypto/decrypt";
import { parseVoteAad } from "@/lib/crypto/envelopes";
import { importWrapPublicKey, openPrivateKey } from "@/lib/crypto/keypair";
import { relock, unlockSession } from "@/lib/crypto/session";
import { apagarDadosLocais, lerChaveSigilo, listarVotosLocais } from "@/lib/storage/db";
import { createClientWith } from "@/lib/supabase/client";
import { CARGOS } from "@/lib/validators/bancada";
import { envelopeVotoSchema } from "@/lib/validators/voto";
import type { VoteEnvelope } from "@/types";

export function PainelCliente({ supabase }: { supabase: { url: string; key: string } | null }) {
  const [linhas, setLinhas] = useState<Array<{ cargo: string; escolha: string }>>([]);
  const [mensagem, setMensagem] = useState("");
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.interativo = "sim";
    return () => {
      relock();
      delete document.documentElement.dataset.interativo;
    };
  }, []);

  async function envelopesRemotos(): Promise<VoteEnvelope[]> {
    if (!supabase) return [];
    const { data } = await createClientWith(supabase.url, supabase.key).auth.getUser();
    if (!data.user) return [];
    const resposta = await fetch("/api/votos");
    if (!resposta.ok) return [];
    const corpo: unknown = await resposta.json();
    if (!corpo || typeof corpo !== "object" || !("itens" in corpo) || !Array.isArray(corpo.itens)) return [];
    return corpo.itens.flatMap((item: unknown) => {
      if (!item || typeof item !== "object" || !("envelope" in item)) return [];
      const parsed = envelopeVotoSchema.safeParse(item.envelope);
      return parsed.success ? [parsed.data] : [];
    });
  }

  async function mostrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const senha = String(new FormData(event.currentTarget).get("senha_sigilo") ?? "");
    event.currentTarget.reset();
    setMensagem("Abrindo a chave de sigilo…");
    setLinhas([]);
    setAberto(false);
    try {
      const gravada = await lerChaveSigilo();
      if (!gravada) {
        setMensagem("Ainda não há chave de sigilo neste navegador.");
        return;
      }
      const privateKey = await openPrivateKey(gravada.privkey_blob, senha);
      const publicKey = await importWrapPublicKey(gravada.privkey_blob.public_key_jwk);
      unlockSession({
        privateKey,
        publicKey,
        publicJwk: gravada.privkey_blob.public_key_jwk,
        publicKeySha256: gravada.public_key_sha256,
      });

      const locais = await listarVotosLocais();
      const porId = new Map<string, VoteEnvelope>();
      for (const item of locais) porId.set(item.id, item.envelope);
      for (const envelope of await envelopesRemotos()) {
        porId.set(parseVoteAad(envelope.aad).recordId, envelope);
      }

      const porCargo = new Map<string, string>();
      for (const envelope of porId.values()) {
        const aad = parseVoteAad(envelope.aad);
        try {
          const payload = await decryptVote({
            envelope,
            privateKey,
            userId: aad.userId,
            recordId: aad.recordId,
          });
          porCargo.set(payload.cargo, descreverEscolha(payload.politico_id));
        } catch {
          // Envelope de outra chave fica de fora. A senha já abriu a chave local.
        }
      }

      setLinhas(
        CARGOS.map((cargo) => ({
          cargo: rotuloCargo(cargo),
          escolha: porCargo.get(cargo) ?? "Ainda não há registro protegido para este cargo.",
        })),
      );
      setAberto(true);
    } catch {
      relock();
      setAberto(false);
      setLinhas([]);
      setMensagem("A senha de sigilo não abriu os votos. Nada foi mostrado.");
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-space-md">
      <Link
        className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full border border-tertiary bg-tertiary-container px-4 text-label-lg text-on-tertiary-container"
        href="/privacidade"
      >
        <ShieldCheck aria-hidden="true" className="size-6" />
        Dado sensível · LGPD
      </Link>
      <form className="flex flex-col gap-space-md" action="javascript:void(0)" onSubmit={mostrar}>
        <Field label="Senha de sigilo">
          <TextInput name="senha_sigilo" type="password" autoComplete="off" required />
        </Field>
        <Button type="submit">Mostrar a bancada</Button>
      </form>
      {mensagem ? (
        <p className="text-body-md text-on-surface" role="alert">
          {mensagem}
        </p>
      ) : null}
      {aberto ? (
        <ul className="flex flex-col gap-space-sm">
          {linhas.map((linha) => (
            <li key={linha.cargo}>
              <Card>
                <p className="text-label-lg">{linha.cargo}</p>
                <p className="text-body-lg">{linha.escolha}</p>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
      <Link className="inline-flex min-h-12 items-center text-label-lg text-secondary underline" href="/linha-do-tempo">
        Ver a linha do tempo do Congresso
      </Link>
      <Button
        type="button"
        variant="outlined"
        onClick={async () => {
          await apagarDadosLocais();
          relock();
          setAberto(false);
          setLinhas([]);
          setMensagem("Os dados locais deste navegador foram apagados. A conta, se existir, permanece.");
        }}
      >
        Expurgar dados locais do navegador
      </Button>
    </div>
  );
}
