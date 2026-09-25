import { BancadaPainel } from "@/components/bancada/bancada-painel";
import { getOptionalSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function BancadaPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      <h1 className="text-[2rem] font-semibold leading-10 text-on-surface">Sua bancada</h1>
      <p className="max-w-2xl text-on-surface">
        Vincule até cinco representantes. A escolha é cifrada neste navegador antes de qualquer envio.
      </p>
      <BancadaPainel supabase={getOptionalSupabasePublicEnv()} />
    </main>
  );
}
