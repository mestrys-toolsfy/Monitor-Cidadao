import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getOptionalSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  const supabase = getOptionalSupabasePublicEnv();

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      <h1 className="text-[2rem] font-semibold leading-10 text-on-surface">Bem-vindo ao Monitor Cidadão</h1>
      <p className="max-w-2xl text-base leading-6 text-on-surface">
        Esta plataforma é independente e apartidária. Ela traduz a atividade pública do Congresso para uma linguagem
        direta. A escolha de voto que você registrar fica protegida no seu navegador.
      </p>
      <OnboardingForm supabase={supabase} />
    </main>
  );
}
