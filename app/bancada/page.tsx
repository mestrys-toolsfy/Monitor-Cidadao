import { BancadaPainel } from "@/components/bancada/bancada-painel";
import { PageMain } from "@/components/layout/page-main";
import { getOptionalSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function BancadaPage() {
  return (
    <PageMain>
      <h1 className="text-headline-lg text-on-surface">Sua bancada</h1>
      <p className="max-w-2xl text-body-lg text-on-surface">
        Vincule até cinco representantes. A escolha é cifrada neste navegador antes de qualquer envio.
      </p>
      <BancadaPainel supabase={getOptionalSupabasePublicEnv()} />
    </PageMain>
  );
}
