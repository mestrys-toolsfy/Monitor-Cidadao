"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setPreference } from "@/lib/storage/kv";
import { createClientWith } from "@/lib/supabase/client";
import { consentimentoOnboardingSchema } from "@/lib/validators/onboarding";

const VERSAO_TEXTO = "onboarding-v1";

export function OnboardingForm({ supabase }: { supabase: { url: string; key: string } | null }) {
  const router = useRouter();
  const [aceita, setAceita] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.interativo = "sim";
    return () => {
      delete document.documentElement.dataset.interativo;
    };
  }, []);

  async function aoEnviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = consentimentoOnboardingSchema.safeParse({ aceitaSigilo: aceita, optInBackup: optIn });
    if (!parsed.success) {
      setMensagem("Marque o compromisso de sigilo para continuar.");
      return;
    }

    setEnviando(true);
    setMensagem("");
    await setPreference("consentimento_onboarding_v1", "true");
    await setPreference("opt_in_backup_v1", parsed.data.optInBackup ? "true" : "false");

    /*
      O aceite em preferência local não é o voto. A tabela `consentimentos`
      aceita mais de uma finalidade. O backup cifrado só é registrado se a
      pessoa marcar o segundo checkbox, junto com profiles.sigilo_opt_in.
    */
    if (supabase) {
      const client = createClientWith(supabase.url, supabase.key);
      const { data } = await client.auth.getUser();
      if (data.user) {
        await client.from("consentimentos").insert({
          user_id: data.user.id,
          finalidade: "uso_plataforma",
          versao_texto: VERSAO_TEXTO,
          aceito: true,
        });
        if (parsed.data.optInBackup) {
          await client.from("consentimentos").insert({
            user_id: data.user.id,
            finalidade: "backup_chave_cifrada",
            versao_texto: VERSAO_TEXTO,
            aceito: true,
          });
          await client
            .from("profiles")
            .update({
              sigilo_opt_in: true,
              sigilo_consent_at: new Date().toISOString(),
            })
            .eq("id", data.user.id);
        }
      }
    }

    setEnviando(false);
    router.push("/bancada");
  }

  return (
    <form className="flex max-w-2xl flex-col gap-4" action="javascript:void(0)" onSubmit={aoEnviar}>
      <p className="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface">
        Dado sensível · LGPD.{" "}
        <Link className="underline" href="/privacidade">
          Leia como o voto é protegido
        </Link>
        .
      </p>
      <label className="flex min-h-12 items-start gap-3 text-on-surface">
        <input
          className="mt-1 size-5"
          type="checkbox"
          checked={aceita}
          onChange={(event) => setAceita(event.target.checked)}
        />
        <span>
          Aceito que minha escolha de voto é um dado sensível, cifrado neste navegador. A plataforma não lê o
          conteúdo. Se eu esquecer a senha de sigilo e o código de recuperação, os votos ficam ilegíveis.
        </span>
      </label>
      <label className="flex min-h-12 items-start gap-3 text-on-surface">
        <input className="mt-1 size-5" type="checkbox" checked={optIn} onChange={(event) => setOptIn(event.target.checked)} />
        <span>
          Quero guardar neste serviço uma cópia cifrada da chave, para abrir a bancada em outro aparelho com a mesma
          senha de sigilo. Sem esta marca, a cópia fica só neste navegador.
        </span>
      </label>
      {mensagem ? <p className="text-sm text-error">{mensagem}</p> : null}
      <Button type="submit" disabled={!aceita || enviando}>
        Continuar para a bancada
      </Button>
    </form>
  );
}
