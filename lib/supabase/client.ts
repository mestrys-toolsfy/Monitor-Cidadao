import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Cliente do navegador com URL e chave já resolvidas no servidor.
 * A chave publicável pode ir para o browser. A service role, não.
 */
export function createClientWith(url: string, key: string) {
  return createBrowserClient(url, key);
}

/** Cliente do navegador. A sessão fica em cookie, no padrão do @supabase/ssr. */
export function createClient() {
  const { url, key } = getSupabasePublicEnv();
  return createClientWith(url, key);
}
