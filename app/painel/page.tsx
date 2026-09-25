import { PageMain } from "@/components/layout/page-main";
import { PainelCliente } from "@/components/painel/painel-cliente";
import { getOptionalSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function PainelPage() {
  return (
    <PageMain>
      <h1 className="text-headline-lg text-on-surface">Painel</h1>
      <p className="max-w-2xl text-body-lg text-on-surface">
        A bancada só aparece depois que a senha de sigilo abre a chave neste navegador.
      </p>
      <PainelCliente supabase={getOptionalSupabasePublicEnv()} />
    </PageMain>
  );
}
