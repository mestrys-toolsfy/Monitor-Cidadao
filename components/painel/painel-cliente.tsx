"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { descreverEscolha, ROTULOS_CARGO } from "@/lib/civic/escolha";
import { decryptVote } from "@/lib/crypto/decrypt";
import { parseVoteAad } from "@/lib/crypto/envelopes";
import { importWrapPublicKey, openPrivateKey } from "@/lib/crypto/keypair";
import { readSession, relock, unlockSession } from "@/lib/crypto/session";
import { apagarDadosLocais, lerChaveSigilo, listarVotosLocais } from "@/lib/storage/db";
import { createClientWith } from "@/lib/supabase/client";
import type { CargoBancada } from "@/lib/validators/bancada";
import { envelopeVotoSchema } from "@/lib/validators/voto";
import type { VoteEnvelope, VotoPayload } from "@/types";

export function PainelCliente({ supabase }: { supabase: { url: string; key: string } | null }) {
  const [linhas, setLinhas] = useState<Array<{ cargo: string; escolha: string }>>([]);
  const [mensagem, setMensagem] = useState("");
  const [aberto, setAberto] = useState(false);

  async function envelopesRemotos(userId: string): Promise<VoteEnvelope[]> {
    if (!supabase) return [];
    const { data } = await createClientWith(supabase.url, supabase.key).auth.getUser();
    if (!data.user || data.user.id !== userId) return [];
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
    setMensagem("");
    setLinhas([]);
    try {
      let sessao = readSession();
      if (!sessao) {
        const gravada = await lerChaveSigilo();
        if (!gravada) {
          setMensagem("Ainda não há chave de sigilo neste navegador.");
          return;
        }
        const privateKey = await openPrivateKey(gravada.privkey_blob, senha);
        const publicKey = await importWrapPublicKey(gravada.privkey_blob.public_key_jwk);
        sessao = {
          privateKey,
          publicKey,
          publicJwk: gravada.privkey_blob.public_key_jwk,
          publicKeySha256: gravada.public_key_sha256,
        };
        unlockSession(sessao);
      }

      const locais = await listarVotosLocais();
      const porId = new Map<string, VoteEnvelope>();
      for (const item of locais) porId.set(item.id, item.envelope);
      const primeiro = locais[0]?.envelope;
      const userId = primeiro ? parseVoteAad(primeiro.aad).userId : "";
      if (userId && !userId.startsWith("local:")) {
        for (const envelope of await envelopesRemotos(userId)) {
          const id = parseVoteAad(envelope.aad).recordId;
          porId.set(id, envelope);
        }
      }

      const porCargo = new Map<string, VotoPayload>();
      for (const envelope of porId.values()) {
        const aad = parseVoteAad(envelope.aad);
        try {
          const payload = await decryptVote({
            envelope,
            privateKey: sessao.privateKey,
            userId: aad.userId,
            recordId: aad.recordId,
          });
          porCargo.set(payload.cargo, payload);
        } catch {
          setMensagem("Uma das escolhas não pôde ser aberta com esta senha de sigilo.");
        }
      }

      setLinhas(
        [...porCargo.values()].map((payload) => ({
          cargo: ROTULOS_CARGO[payload.cargo as CargoBancada] ?? "Cargo acompanhado",
          escolha: descreverEscolha(payload.politico_id),
        })),
      );
      setAberto(true);
      event.currentTarget.reset();
    } catch {
      setMensagem("Não foi possível abrir o sigilo. Confira a senha de sigilo.");
      setAberto(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-sm">
        Dado sensível · LGPD.{" "}
        <Link className="underline" href="/privacidade">
          Política de privacidade
        </Link>
      </p>
      <form className="flex flex-col gap-4" onSubmit={mostrar}>
        <Field label="Senha de sigilo">
          <TextInput name="senha_sigilo" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit">Mostrar a bancada</Button>
      </form>
      {mensagem ? <p className="text-sm text-on-surface">{mensagem}</p> : null}
      {aberto ? (
        <ul className="flex flex-col gap-3">
          {linhas.length === 0 ? <li>Nenhuma escolha protegida neste navegador.</li> : null}
          {linhas.map((linha) => (
            <li key={linha.cargo} className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
              <p className="font-semibold">{linha.cargo}</p>
              <p>{linha.escolha}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <Link className="inline-flex min-h-12 items-center font-semibold text-secondary underline" href="/linha-do-tempo">
        Ver a linha do tempo do Congresso
      </Link>
      <Button
        type="button"
        variant="outlined"
        onClick={() => {
          relock();
          setAberto(false);
          setLinhas([]);
        }}
      >
        Bloquear a chave de sigilo
      </Button>
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
