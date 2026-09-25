/**
 * Ponte do navegador com o worker de PBKDF2.
 * Este módulo não é importado pelo teste Node: `deriveKekInWorker`
 * só chega aqui quando `window` e `Worker` existem.
 */
import { SigiloCryptoError } from "@/lib/crypto/errors";

interface DeriveWorkerSuccess {
  id: string;
  ok: true;
  kek: CryptoKey;
}

interface DeriveWorkerFailure {
  id: string;
  ok: false;
}

type DeriveWorkerResponse = DeriveWorkerSuccess | DeriveWorkerFailure;

export function deriveKekWithBrowserWorker(
  secret: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./kdf.worker.ts", import.meta.url), { type: "module" });
    const id = crypto.randomUUID();
    const saltCopy = new Uint8Array(salt);
    let settled = false;

    const timer = window.setTimeout(() => {
      finish(new SigiloCryptoError("A derivação da senha de sigilo demorou demais."));
    }, 120_000);

    function finish(error: SigiloCryptoError | null, kek?: CryptoKey) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker.terminate();
      if (error || !kek) {
        reject(error ?? new SigiloCryptoError("Não foi possível derivar a chave de sigilo."));
        return;
      }
      resolve(kek);
    }

    worker.onmessage = (event: MessageEvent<DeriveWorkerResponse>) => {
      const data = event.data;
      if (!data || data.id !== id) return;
      if (data.ok) finish(null, data.kek);
      else finish(new SigiloCryptoError("Não foi possível derivar a chave de sigilo."));
    };

    worker.onerror = () => {
      finish(new SigiloCryptoError("Não foi possível derivar a chave de sigilo."));
    };

    worker.postMessage({ id, secret, salt: saltCopy, iterations });
  });
}
