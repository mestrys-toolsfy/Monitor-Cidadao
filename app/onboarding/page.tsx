import Link from "next/link";
import { PageMain } from "@/components/layout/page-main";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getOptionalSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  const supabase = getOptionalSupabasePublicEnv();

  return (
    <PageMain>
      <h1 className="text-headline-lg text-on-surface">Bem-vindo ao Monitor Cidadão</h1>
      <p className="max-w-2xl text-body-lg text-on-surface">
        A plataforma é neutra e apartidária. Ela não recomenda candidato, não é órgão de governo e não pertence a
        partido.
      </p>
      <p className="max-w-2xl text-body-lg text-on-surface">
        A independência vem das fontes oficiais: o que aparece sobre o Congresso é dado público. A leitura e o
        acompanhamento são seus.
      </p>
      <p className="max-w-2xl text-body-lg text-on-surface">
        O compromisso de sigilo cívico é este: a escolha de voto é um dado sensível, cifrado no navegador, e a
        plataforma não lê o conteúdo. Esquecer a senha de sigilo e o código de recuperação torna os votos ilegíveis.
      </p>
      <p className="max-w-2xl text-body-md text-on-surface-variant">
        <Link className="inline-flex min-h-12 items-center underline" href="/privacidade">
          Leia a política de privacidade
        </Link>
        .
      </p>
      <OnboardingForm supabase={supabase} />
    </PageMain>
  );
}
