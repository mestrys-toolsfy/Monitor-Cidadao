/**
 * Worker dedicado da derivação PBKDF2.
 * Só é carregado no navegador. O teste Node chama `deriveKek` direto.
 * A senha chega na mensagem e não é reenviada. A resposta leva só a KEK
 * (não extraível) ou uma falha sem detalhe.
 */
import { deriveKek } from "./kdf";

interface DeriveWorkerRequest {
  id: string;
  secret: string;
  salt: Uint8Array;
  iterations: number;
}

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

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<DeriveWorkerRequest>) => void) | null;
  postMessage: (data: DeriveWorkerResponse) => void;
};

scope.onmessage = (event) => {
  const { id, secret, salt, iterations } = event.data;
  void deriveKek(secret, salt, iterations)
    .then((kek) => {
      scope.postMessage({ id, ok: true, kek });
    })
    .catch(() => {
      scope.postMessage({ id, ok: false });
    });
};
