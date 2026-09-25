"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { cruzarBancada, deputadoDaEscolha, type LinhaComparador } from "@/lib/civic/comparador";
import { decryptVote } from "@/lib/crypto/decrypt";
import { parseVoteAad } from "@/lib/crypto/envelopes";
import { importWrapPublicKey, openPrivateKey } from "@/lib/crypto/keypair";
import { readSession, unlockSession } from "@/lib/crypto/session";
import { lerChaveSigilo, listarVotosLocais } from "@/lib/storage/db";
import { listaVotacoesNominaisSchema } from "@/lib/validators/governo";

const TOM: Record<string, string> = {
  sim: "bg-primary-container text-on-primary-container",
  nao: "bg-error-container text-on-error-container",
  neutro: "bg-surface-container-high text-on-surface",
};

export function ComparadorPainel() {
  const [linhas, setLinhas] = useState<LinhaComparador[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState("");

  async function comparar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const senha = String(new FormData(event.currentTarget).get("senha_sigilo") ?? "");
    setMensagem("");
    setLinhas([]);
    try {
      let sessao = readSession();
      if (!sessao) {
        const gravada = await lerChaveSigilo();
        if (!gravada) {
          setMensagem("Cadastre a bancada neste navegador antes de comparar.");
          return;
        }
        const privateKey = await openPrivateKey(gravada.privkey_blob, senha);
        sessao = {
          privateKey,
          publicKey: await importWrapPublicKey(gravada.privkey_blob.public_key_jwk),
          publicJwk: gravada.privkey_blob.public_key_jwk,
          publicKeySha256: gravada.public_key_sha256,
        };
        unlockSession(sessao);
      }

      const deputados = new Map<number, string>();
      for (const item of await listarVotosLocais()) {
        const aad = parseVoteAad(item.envelope.aad);
        try {
          const payload = await decryptVote({
            envelope: item.envelope,
            privateKey: sessao.privateKey,
            userId: aad.userId,
            recordId: aad.recordId,
          });
          const deputado = deputadoDaEscolha(payload.politico_id);
          if (deputado) deputados.set(deputado.id, deputado.rotulo);
        } catch {
          setMensagem("Uma escolha não abriu com esta senha de sigilo.");
        }
      }

      if (deputados.size === 0) {
        setMensagem("O comparador desta fase usa deputados federais escolhidos na busca da Câmara.");
        return;
      }

      const resposta = await fetch("/api/governo/camara?recurso=comparativo");
      if (!resposta.ok) {
        setMensagem("Não foi possível consultar as votações públicas agora.");
        return;
      }
      const parsed = listaVotacoesNominaisSchema.safeParse((await resposta.json()).itens);
      if (!parsed.success) {
        setMensagem("A lista pública veio em um formato inesperado.");
        return;
      }

      const lista = [...deputados.entries()].map(([id, rotulo]) => ({ id, rotulo }));
      setColunas(lista.map((item) => item.rotulo));
      setLinhas(cruzarBancada(parsed.data, lista));
      event.currentTarget.reset();
    } catch {
      setMensagem("Não foi possível abrir o sigilo. Confira a senha de sigilo.");
    }
  }

  return (
    <div className="flex flex-col gap-md">
      <Card className="text-body-md">
        Dado sensível · LGPD. A comparação acontece neste navegador. A consulta à Câmara pede só a lista pública, sem o
        seu voto.{" "}
        <Link className="inline-flex min-h-12 items-center underline" href="/privacidade">
          Política de privacidade
        </Link>
      </Card>
      <form className="flex max-w-md flex-col gap-md" onSubmit={comparar}>
        <Field label="Senha de sigilo">
          <TextInput name="senha_sigilo" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit">Comparar votações</Button>
      </form>
      {mensagem ? <p className="text-body-md text-on-surface">{mensagem}</p> : null}
      {linhas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-body-md">
            <caption className="sr-only">Como os deputados da bancada votaram em plenário</caption>
            <thead>
              <tr>
                <th className="px-3 py-3 text-label-lg">Votação</th>
                {colunas.map((coluna) => (
                  <th key={coluna} className="px-3 py-3 text-label-lg">
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.id} className="border-t border-outline-variant">
                  <td className="px-3 py-3 align-top">
                    <p className="text-body-lg">{linha.titulo}</p>
                    <a className="inline-flex min-h-12 items-center text-label-lg text-secondary underline" href={linha.fonteUrl}>
                      Ficha oficial · {linha.data}
                    </a>
                  </td>
                  {linha.celulas.map((celula) => (
                    <td key={`${linha.id}-${celula.deputadoId}`} className="px-3 py-3 align-top">
                      <span className={cn("inline-flex min-h-12 items-center rounded-full px-4 text-label-lg", TOM[celula.tom])}>
                        {celula.rotulo}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
