import localforage from "localforage";

/**
 * Preferências não sensíveis (tema, identificador do aparelho).
 * A chave privada não passa por aqui e não vai para o localStorage.
 */
function preferencias(): LocalForage {
  return localforage.createInstance({
    name: "monitor_cidadao",
    storeName: "preferencias",
  });
}

export async function getPreference(key: string): Promise<string | null> {
  const value = await preferencias().getItem<string>(key);
  return value;
}

export async function setPreference(key: string, value: string): Promise<void> {
  await preferencias().setItem(key, value);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getPreference("device_id");
  if (existing) return existing;
  const created = crypto.randomUUID();
  await setPreference("device_id", created);
  return created;
}
