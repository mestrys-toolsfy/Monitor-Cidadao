import Dexie, { type EntityTable } from "dexie";
import type { KeyBackupEnvelope } from "@/types";

/**
 * IndexedDB versionado. Guarda só o blob cifrado da chave privada,
 * nunca a senha nem o PKCS#8 em claro. O código de recuperação também
 * não entra aqui: só o segundo blob, já cifrado.
 */
export interface ChaveSigiloRecord {
  id: string;
  privkey_blob: KeyBackupEnvelope;
  iv: string;
  salt: string;
  created_at: string;
  device_id: string;
  public_key_sha256: string;
  recovery_blob: KeyBackupEnvelope;
}

class MonitorCidadaoDb extends Dexie {
  chaves_sigilo!: EntityTable<ChaveSigiloRecord, "id">;

  constructor() {
    super("monitor_cidadao");
    this.version(1).stores({
      chaves_sigilo: "id, device_id, public_key_sha256, created_at",
    });
  }
}

let database: MonitorCidadaoDb | null = null;

function getDb(): MonitorCidadaoDb {
  if (typeof indexedDB === "undefined") {
    throw new Error("O armazenamento local do sigilo só existe no navegador.");
  }
  if (!database) {
    database = new MonitorCidadaoDb();
  }
  return database;
}

export async function salvarChaveSigilo(record: ChaveSigiloRecord): Promise<void> {
  await getDb().chaves_sigilo.put(record);
}
