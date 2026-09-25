import type { KeyBackupEnvelope, PublicRsaJwk } from "@/types";
import { SigiloCryptoError } from "@/lib/crypto/errors";
import { createClientWith } from "@/lib/supabase/client";

/**
 * Envia só a chave pública. A cópia cifrada da chave privada só segue
 * se o opt-in já estiver marcado. A senha de sigilo não entra aqui.
 */
export async function publicarChavePublica(params: {
  supabase: { url: string; key: string } | null;
  publicJwk: PublicRsaJwk;
  publicKeySha256: string;
  backup: KeyBackupEnvelope;
  recoveryBackup: KeyBackupEnvelope;
  optInBackup: boolean;
}): Promise<string> {
  if (!params.supabase) return params.publicKeySha256;

  const client = createClientWith(params.supabase.url, params.supabase.key);
  const { data } = await client.auth.getUser();
  if (!data.user) return params.publicKeySha256;

  const { data: perfil, error } = await client
    .from("profiles")
    .select("public_key_sha256")
    .eq("id", data.user.id)
    .maybeSingle();
  if (error) {
    throw new SigiloCryptoError("Não foi possível conferir a chave desta conta.");
  }

  const remota = typeof perfil?.public_key_sha256 === "string" ? perfil.public_key_sha256 : null;
  if (remota && remota !== params.publicKeySha256) {
    throw new SigiloCryptoError("A chave pública local não confere com a cópia do servidor.");
  }

  const patch: Record<string, unknown> = {
    public_key_jwk: params.publicJwk,
    public_key_sha256: params.publicKeySha256,
  };
  if (params.optInBackup) {
    patch.sigilo_opt_in = true;
    patch.sigilo_consent_at = new Date().toISOString();
    patch.privkey_backup_blob = params.backup;
    patch.recovery_backup_blob = params.recoveryBackup;
  }

  const { error: updateError } = await client.from("profiles").update(patch).eq("id", data.user.id);
  if (updateError) {
    throw new SigiloCryptoError("Não foi possível guardar a chave pública.");
  }
  return params.publicKeySha256;
}
