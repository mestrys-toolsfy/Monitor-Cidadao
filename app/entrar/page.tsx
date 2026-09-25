import { EntrarForm } from "@/components/auth/entrar-form";
import { PageMain } from "@/components/layout/page-main";
import { getOptionalSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function EntrarPage() {
  const supabase = getOptionalSupabasePublicEnv();

  return (
    <PageMain>
      <h1 className="text-headline-lg text-on-surface">Entrar</h1>
      <p className="max-w-2xl text-body-lg text-on-surface">
        A senha da conta não é a senha de sigilo. A senha de sigilo protege o voto e não é enviada ao serviço.
      </p>
      {supabase ? (
        <EntrarForm supabase={supabase} />
      ) : (
        <p className="max-w-2xl text-body-lg text-on-surface">
          Para criar a conta, copie <code className="rounded-sm bg-surface-container-highest px-1">.env.local.example</code>{" "}
          para <code className="rounded-sm bg-surface-container-highest px-1">.env.local</code> e preencha{" "}
          <code className="rounded-sm bg-surface-container-highest px-1">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code className="rounded-sm bg-surface-container-highest px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>. Não
          coloque a chave service_role nesse arquivo. Sem essas duas variáveis, esta tela não tenta entrar. O cadastro da
          bancada ainda pode ficar só neste navegador.
        </p>
      )}
    </PageMain>
  );
}
