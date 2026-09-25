"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { montarPayloadBancada, ROTULOS_CARGO } from "@/lib/civic/escolha";
import { publicarChavePublica } from "@/lib/civic/publicar-chave";
import { encryptVote } from "@/lib/crypto/encrypt";
import { SigiloCryptoError } from "@/lib/crypto/errors";
import { createSigiloKeys, openPrivateKey, importWrapPublicKey } from "@/lib/crypto/keypair";
import { readSession, relock, unlockSession } from "@/lib/crypto/session";
import { getOrCreateDeviceId, getPreference } from "@/lib/storage/kv";
import { lerChaveSigilo, listarVotosLocais, salvarChaveSigilo, salvarVotoLocal } from "@/lib/storage/db";
import { createClientWith } from "@/lib/supabase/client";
import { CARGOS, escolhaManualSchema, type CargoBancada } from "@/lib/validators/bancada";
import { listaDeputadosResumoSchema, type DeputadoResumo } from "@/lib/validators/governo";
import { senhaSigiloSchema } from "@/lib/validators/sigilo";

type Etapa = "carregando" | "criar" | "abrir" | "registrar";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export function BancadaPainel({ supabase }: { supabase: { url: string; key: string } | null }) {
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [mensagem, setMensagem] = useState("");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [cargo, setCargo] = useState<CargoBancada>("deputado_federal");
  const [branco, setBranco] = useState(false);
  const [deputados, setDeputados] = useState<DeputadoResumo[]>([]);
  const [escolhido, setEscolhido] = useState<DeputadoResumo | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [memoria, setMemoria] = useState<string[]>([]);

  useEffect(() => {
    let vivo = true;
    lerChaveSigilo()
      .then((chave) => {
        if (!vivo) return;
        document.documentElement.dataset.interativo = "sim";
        setEtapa(readSession() ? "registrar" : chave ? "abrir" : "criar");
      })
      .catch(() => {
        if (vivo) setMensagem("Não foi possível ler o sigilo deste navegador.");
      });
    return () => {
      vivo = false;
      relock();
      delete document.documentElement.dataset.interativo;
    };
  }, []);

  async function atualizarProgresso() {
    const sessao = readSession();
    if (!sessao) return;
    const locais = await listarVotosLocais();
    const cargos = new Set<string>();
    for (const item of locais) {
      try {
        const { decryptVote } = await import("@/lib/crypto/decrypt");
        const { parseVoteAad } = await import("@/lib/crypto/envelopes");
        const aad = parseVoteAad(item.envelope.aad);
        const payload = await decryptVote({
          envelope: item.envelope,
          privateKey: sessao.privateKey,
          userId: aad.userId,
          recordId: aad.recordId,
        });
        if ((CARGOS as readonly string[]).includes(payload.cargo)) {
          cargos.add(payload.cargo);
        }
      } catch {
        // Envelope de outra chave não entra na contagem.
      }
    }
    setProgresso(Math.min(cargos.size, CARGOS.length));
  }

  async function criarChave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const senha = String(new FormData(event.currentTarget).get("senha_sigilo") ?? "");
    event.currentTarget.reset();
    if (!senhaSigiloSchema.safeParse(senha).success) {
      setMensagem("A senha de sigilo precisa ter pelo menos 12 caracteres.");
      return;
    }
    setMensagem("Protegendo sua chave de sigilo…");
    try {
      const material = await createSigiloKeys(senha);
      const deviceId = await getOrCreateDeviceId();
      await salvarChaveSigilo({
        id: "aparelho",
        privkey_blob: material.backup,
        iv: material.backup.cipher.iv,
        salt: material.backup.kdf.salt,
        created_at: material.backup.created_at,
        device_id: deviceId,
        public_key_sha256: material.publicKeySha256,
        recovery_blob: material.recoveryBackup,
      });
      const optIn = (await getPreference("opt_in_backup_v1")) === "true";
      const sha = await publicarChavePublica({
        supabase,
        publicJwk: material.publicJwk,
        publicKeySha256: material.publicKeySha256,
        backup: material.backup,
        recoveryBackup: material.recoveryBackup,
        optInBackup: optIn,
      });
      unlockSession({
        privateKey: material.privateKey,
        publicKey: material.publicKey,
        publicJwk: material.publicJwk,
        publicKeySha256: sha,
      });
      setCodigo(material.recoveryCode);
      setEtapa("registrar");
      setMensagem("");
    } catch (error) {
      setMensagem(error instanceof SigiloCryptoError ? error.message : "Não foi possível criar a chave de sigilo.");
    }
  }

  async function abrirChave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const senha = String(new FormData(event.currentTarget).get("senha_sigilo") ?? "");
    event.currentTarget.reset();
    setMensagem("Abrindo a chave de sigilo…");
    try {
      const gravada = await lerChaveSigilo();
      if (!gravada) {
        setEtapa("criar");
        return;
      }
      const privateKey = await openPrivateKey(gravada.privkey_blob, senha);
      const publicKey = await importWrapPublicKey(gravada.privkey_blob.public_key_jwk);
      const optIn = (await getPreference("opt_in_backup_v1")) === "true";
      const sha = await publicarChavePublica({
        supabase,
        publicJwk: gravada.privkey_blob.public_key_jwk,
        publicKeySha256: gravada.public_key_sha256,
        backup: gravada.privkey_blob,
        recoveryBackup: gravada.recovery_blob,
        optInBackup: optIn,
      });
      unlockSession({
        privateKey,
        publicKey,
        publicJwk: gravada.privkey_blob.public_key_jwk,
        publicKeySha256: sha,
      });
      setEtapa("registrar");
      setMensagem("");
      await atualizarProgresso();
    } catch (error) {
      relock();
      setMensagem(error instanceof SigiloCryptoError ? error.message : "Não foi possível abrir o sigilo. Confira a senha de sigilo.");
    }
  }

  async function buscarDeputados(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nome = String(new FormData(event.currentTarget).get("nome") ?? "").trim();
    setMensagem("");
    const resposta = await fetch(`/api/governo/camara?recurso=deputados&nome=${encodeURIComponent(nome)}`);
    if (!resposta.ok) {
      setDeputados([]);
      setMensagem("Não foi possível buscar deputados agora.");
      return;
    }
    const parsed = listaDeputadosResumoSchema.safeParse((await resposta.json()).itens);
    setDeputados(parsed.success ? parsed.data : []);
  }

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessao = readSession();
    if (!sessao) {
      setEtapa("abrir");
      return;
    }
    const dados = new FormData(event.currentTarget);
    let identificador = "branco-ou-nulo";
    let nomeExibido = "Voto em branco ou nulo";
    if (!branco) {
      if (cargo === "deputado_federal") {
        if (!escolhido) {
          setMensagem("Escolha um deputado federal na lista.");
          return;
        }
        identificador = `camara:${escolhido.id}:${escolhido.nome}:${escolhido.partido}:${escolhido.uf}`;
        nomeExibido = escolhido.nome;
      } else {
        const manual = escolhaManualSchema.safeParse({
          nome: dados.get("nome"),
          uf: dados.get("uf"),
          partido: dados.get("partido") ?? "",
          identificador: dados.get("identificador") ?? "",
        });
        if (!manual.success) {
          setMensagem(manual.error.issues[0]?.message ?? "Confira os dados do cargo.");
          return;
        }
        identificador = `manual:${manual.data.nome}:${manual.data.partido}:${manual.data.uf}:${manual.data.identificador}`;
        nomeExibido = manual.data.nome;
      }
    }

    const payload = montarPayloadBancada({ cargo, brancoOuNulo: branco, identificador });
    const recordId = crypto.randomUUID();
    let userId = `local:${await getOrCreateDeviceId()}`;
    if (supabase) {
      const { data } = await createClientWith(supabase.url, supabase.key).auth.getUser();
      if (data.user) userId = data.user.id;
    }

    try {
      // A senha de sigilo não entra aqui: a sessão já tem a chave. Só o envelope segue.
      const envelope = await encryptVote({
        payload,
        publicKey: sessao.publicKey,
        localPublicSha256: sessao.publicKeySha256,
        serverPublicSha256: sessao.publicKeySha256,
        userId,
        recordId,
      });
      await salvarVotoLocal({ id: recordId, envelope, created_at: new Date().toISOString() });
      if (supabase && !userId.startsWith("local:")) {
        const resposta = await fetch("/api/votos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(envelope),
        });
        if (!resposta.ok && resposta.status !== 501) {
          setMensagem("O voto ficou protegido neste navegador. A conta ainda não recebeu a cópia.");
        }
      }
      setMemoria((atual) => [`${ROTULOS_CARGO[cargo]}: ${nomeExibido}`, ...atual]);
      setMensagem("Voto protegido. O conteúdo não foi enviado em claro.");
      await atualizarProgresso();
    } catch (error) {
      setMensagem(error instanceof SigiloCryptoError ? error.message : "Não foi possível proteger o voto.");
    }
  }

  if (etapa === "carregando") {
    return <p className="text-on-surface">Carregando o sigilo deste navegador…</p>;
  }

  if (etapa === "criar" || etapa === "abrir") {
    return (
      <form className="flex max-w-md flex-col gap-4" action="javascript:void(0)" onSubmit={etapa === "criar" ? criarChave : abrirChave}>
        <Field label="Senha de sigilo">
          <TextInput name="senha_sigilo" type="password" autoComplete="off" required />
        </Field>
        <p className="text-sm text-on-surface-variant">
          {etapa === "criar"
            ? "Crie uma senha só para o voto, diferente da senha da conta. Ela não é enviada ao serviço."
            : "Digite a senha de sigilo para continuar o cadastro neste aparelho."}
        </p>
        {mensagem ? <p className="text-sm text-on-surface">{mensagem}</p> : null}
        <Button type="submit">{etapa === "criar" ? "Criar chave de sigilo" : "Abrir chave de sigilo"}</Button>
      </form>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <p className="text-on-surface">
        {progresso} de 5
      </p>
      {codigo ? (
        <p className="rounded-lg border border-tertiary bg-tertiary-container px-4 py-3 text-on-tertiary-container">
          Guarde este código de recuperação. Ele aparece uma vez: {codigo}
        </p>
      ) : null}
      <p className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-sm">
        Dado sensível · LGPD.{" "}
        <Link className="underline" href="/privacidade">
          Política de privacidade
        </Link>
      </p>
      <form className="flex flex-col gap-4" onSubmit={buscarDeputados}>
        <Field label="Cargo">
          <SelectInput
            value={cargo}
            onChange={(event) => {
              setCargo(event.target.value as CargoBancada);
              setEscolhido(null);
            }}
          >
            {CARGOS.map((item) => (
              <option key={item} value={item}>
                {ROTULOS_CARGO[item]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" className="size-5" checked={branco} onChange={(event) => setBranco(event.target.checked)} />
          Voto em branco ou nulo
        </label>
        {cargo === "deputado_federal" && !branco ? (
          <>
            <Field label="Nome de urna, partido ou número">
              <TextInput name="nome" />
            </Field>
            <Button type="submit" variant="outlined">
              Buscar na Câmara
            </Button>
            <ul className="flex flex-col gap-2">
              {deputados.map((pessoa) => (
                <li key={pessoa.id}>
                  <button
                    type="button"
                    className="inline-flex min-h-12 w-full items-center rounded-lg border border-outline px-3 text-left"
                    onClick={() => setEscolhido(pessoa)}
                  >
                    {pessoa.nome} · {pessoa.partido}-{pessoa.uf}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </form>
      <form className="flex flex-col gap-4" onSubmit={registrar}>
        {cargo !== "deputado_federal" && !branco ? (
          <>
            <Field label="Nome">
              <TextInput name="nome" />
            </Field>
            <Field label="Partido">
              <TextInput name="partido" />
            </Field>
            <Field label="Estado">
              <SelectInput name="uf" defaultValue="SP">
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Identificador textual">
              <TextInput name="identificador" autoComplete="off" />
            </Field>
          </>
        ) : null}
        {escolhido ? <p>Selecionado nesta tela: {escolhido.nome}</p> : null}
        {mensagem ? <p className="text-sm text-on-surface">{mensagem}</p> : null}
        <Button type="submit">Proteger esta escolha</Button>
        <Button
          type="button"
          variant="outlined"
          onClick={() => {
            relock();
            setEtapa("abrir");
          }}
        >
          Bloquear a chave de sigilo
        </Button>
      </form>
      {memoria.length > 0 ? (
        <ul className="flex flex-col gap-2 text-on-surface">
          {memoria.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
