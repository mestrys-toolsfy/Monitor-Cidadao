import Link from "next/link";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getOptionalSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  const supabase = getOptionalSupabasePublicEnv();

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      <h1 className="text-[2rem] font-semibold leading-10 text-on-surface">Bem-vindo ao Monitor Cidadão</h1>
      <p className="max-w-2xl text-base leading-6 text-on-surface">
        A plataforma é neutra e apartidária. Ela não recomenda candidato, não é órgão de governo e não pertence a
        partido.
      </p>
      <p className="max-w-2xl text-base leading-6 text-on-surface">
        A independência vem das fontes oficiais: o que aparece sobre o Congresso é dado público. A leitura e o
        acompanhamento são seus.
      </p>
      <p className="max-w-2xl text-base leading-6 text-on-surface">
        O compromisso de sigilo cívico é este: a escolha de voto é um dado sensível, cifrado no navegador, e a
        plataforma não lê o conteúdo. Esquecer a senha de sigilo e o código de recuperação torna os votos ilegíveis.
      </p>
      <p className="max-w-2xl text-sm leading-5 text-on-surface-variant">
        <Link className="underline" href="/privacidade">
          Leia a política de privacidade
        </Link>
        .
      </p>
      <OnboardingForm supabase={supabase} />
    </main>
  );
}
