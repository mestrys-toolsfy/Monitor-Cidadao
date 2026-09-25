/** Lê só a URL e a chave publicável. A service_role não entra neste módulo. */
export function getOptionalSupabasePublicEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return getOptionalSupabasePublicEnv() !== null;
}

export function getSupabasePublicEnv(): { url: string; key: string } {
  const env = getOptionalSupabasePublicEnv();
  if (!env) {
    throw new Error("Supabase não está configurado.");
  }
  return env;
}
