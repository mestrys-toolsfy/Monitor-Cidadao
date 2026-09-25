export type FonteGoverno = "camara" | "senado" | "tse" | "transparencia";

export type MotivoErroGoverno = "timeout" | "http" | "parse" | "configuracao";

/** Falha de API pública. A mensagem não carrega corpo, chave nem voto. */
export class ErroApiGoverno extends Error {
  readonly fonte: FonteGoverno;
  readonly motivo: MotivoErroGoverno;

  constructor(fonte: FonteGoverno, motivo: MotivoErroGoverno, mensagem: string) {
    super(mensagem);
    this.name = "ErroApiGoverno";
    this.fonte = fonte;
    this.motivo = motivo;
  }
}

const TIMEOUT_MS = 12_000;

function ehTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

/**
 * GET JSON com tempo limite. O corpo de erro não é lido nem registrado.
 * A resposta fica em cache por 15 minutos: o dado público não precisa ser ao vivo.
 */
export async function buscarJson(
  url: string,
  fonte: FonteGoverno,
  headers?: HeadersInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...headersToRecord(headers),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 900 },
    });
  } catch (error) {
    if (ehTimeout(error)) {
      throw new ErroApiGoverno(fonte, "timeout", "O serviço público demorou para responder.");
    }
    throw new ErroApiGoverno(fonte, "http", "O serviço público não respondeu.");
  }

  if (!response.ok) {
    throw new ErroApiGoverno(fonte, "http", "O serviço público recusou a consulta.");
  }

  try {
    return await response.json();
  } catch {
    throw new ErroApiGoverno(fonte, "parse", "A resposta pública veio em um formato inesperado.");
  }
}

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
}
