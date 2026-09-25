"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { createClientWith } from "@/lib/supabase/client";

export function EntrarForm({ supabase }: { supabase: { url: string; key: string } }) {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    const email = String(dados.get("email") ?? "").trim();
    const senha = String(dados.get("senha") ?? "");
    if (!email || senha.length < 6) {
      setMensagem("Informe um e-mail válido e uma senha de conta com pelo menos 6 caracteres.");
      return;
    }

    setEnviando(true);
    setMensagem("");
    const client = createClientWith(supabase.url, supabase.key);
    const resultado =
      modo === "criar"
        ? await client.auth.signUp({ email, password: senha })
        : await client.auth.signInWithPassword({ email, password: senha });

    setEnviando(false);
    if (resultado.error) {
      setMensagem("Não foi possível concluir o acesso. Confira o e-mail e a senha da conta.");
      return;
    }
    if (modo === "criar" && !resultado.data.session) {
      setMensagem("Conta criada. Confirme o e-mail, se o projeto pedir, e depois entre.");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <form className="flex max-w-md flex-col gap-4" onSubmit={aoEnviar}>
      <p className="text-sm text-on-surface-variant">
        Esta senha abre a conta. Ela não é a senha de sigilo que protege o voto.
      </p>
      <Field label="E-mail">
        <TextInput name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Senha da conta">
        <TextInput name="senha" type="password" autoComplete={modo === "criar" ? "new-password" : "current-password"} required />
      </Field>
      {mensagem ? <p className="text-sm text-on-surface">{mensagem}</p> : null}
      <Button type="submit" disabled={enviando}>
        {modo === "criar" ? "Criar conta" : "Entrar"}
      </Button>
      <button
        type="button"
        className="inline-flex min-h-12 items-center text-left text-sm font-semibold text-secondary underline"
        onClick={() => setModo(modo === "criar" ? "entrar" : "criar")}
      >
        {modo === "criar" ? "Já tenho conta" : "Criar uma conta"}
      </button>
      <Link className="inline-flex min-h-12 items-center text-sm underline" href="/privacidade">
        Como o voto é protegido
      </Link>
    </form>
  );
}
