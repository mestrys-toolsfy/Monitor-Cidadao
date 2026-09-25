import Dexie, { type EntityTable } from "dexie";
import type { KeyBackupEnvelope, VoteEnvelope } from "@/types";

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

/** Envelope já cifrado. Sem cargo, nome ou identificador em claro. */
export interface VotoLocalRecord {
  id: string;
  envelope: VoteEnvelope;
  created_at: string;
}

class MonitorCidadaoDb extends Dexie {
  chaves_sigilo!: EntityTable<ChaveSigiloRecord, "id">;
  votos_locais!: EntityTable<VotoLocalRecord, "id">;

  constructor() {
    super("monitor_cidadao");
    this.version(1).stores({
      chaves_sigilo: "id, device_id, public_key_sha256, created_at",
    });
    this.version(2).stores({
      chaves_sigilo: "id, device_id, public_key_sha256, created_at",
      votos_locais: "id, created_at",
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

const CHAVE_LOCAL_ID = "aparelho";

export async function salvarChaveSigilo(record: ChaveSigiloRecord): Promise<void> {
  await getDb().chaves_sigilo.put({ ...record, id: CHAVE_LOCAL_ID });
}

export async function lerChaveSigilo(): Promise<ChaveSigiloRecord | null> {
  const row = await getDb().chaves_sigilo.get(CHAVE_LOCAL_ID);
  return row ?? null;
}

export async function salvarVotoLocal(record: VotoLocalRecord): Promise<void> {
  await getDb().votos_locais.put(record);
}

export async function listarVotosLocais(): Promise<VotoLocalRecord[]> {
  return getDb().votos_locais.orderBy("created_at").toArray();
}

/** Apaga chave e votos locais. Não chama o servidor. */
export async function apagarDadosLocais(): Promise<void> {
  const db = getDb();
  await db.votos_locais.clear();
  await db.chaves_sigilo.clear();
}
