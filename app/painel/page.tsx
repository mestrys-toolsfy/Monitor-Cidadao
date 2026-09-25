import { PainelCliente } from "@/components/painel/painel-cliente";
import { getOptionalSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function PainelPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      <h1 className="text-[2rem] font-semibold leading-10 text-on-surface">Painel</h1>
      <p className="max-w-2xl text-on-surface">
        A bancada só aparece depois que a senha de sigilo abre a chave neste navegador.
      </p>
      <PainelCliente supabase={getOptionalSupabasePublicEnv()} />
    </main>
  );
}
