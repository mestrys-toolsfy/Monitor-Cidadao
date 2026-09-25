import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Cliente de Server Components, Server Actions e Route Handlers.
 * Só getAll/setAll. Em Server Component o setAll pode falhar: o middleware
 * é quem grava o cookie renovado.
 */
export async function createClient() {
  const { url, key } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Server Component não consegue aplicar estes cabeçalhos de cache.
        // O middleware grava o cookie e os cabeçalhos na resposta.
        void headers;
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Chamado a partir de um Server Component. O middleware renova a sessão.
        }
      },
    },
  });
}
