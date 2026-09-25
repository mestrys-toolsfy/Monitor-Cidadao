import { EntrarForm } from "@/components/auth/entrar-form";
import { getOptionalSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function EntrarPage() {
  const supabase = getOptionalSupabasePublicEnv();

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      <h1 className="text-[2rem] font-semibold leading-10 text-on-surface">Entrar</h1>
      <p className="max-w-2xl text-on-surface">
        A senha da conta não é a senha de sigilo. A senha de sigilo protege o voto e não é enviada ao serviço.
      </p>
      {supabase ? (
        <EntrarForm supabase={supabase} />
      ) : (
        <p className="max-w-2xl text-on-surface">
          Para criar a conta, copie <code>.env.local.example</code> para <code>.env.local</code> e preencha{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>. Não coloque a
          chave service_role nesse arquivo. Sem essas duas variáveis, esta tela não tenta entrar. O cadastro da
          bancada ainda pode ficar só neste navegador.
        </p>
      )}
    </main>
  );
}
