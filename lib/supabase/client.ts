import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/** Cliente do navegador. A sessão fica em cookie, no padrão do @supabase/ssr. */
export function createClient() {
  const { url, key } = getSupabasePublicEnv();
  return createBrowserClient(url, key);
}
