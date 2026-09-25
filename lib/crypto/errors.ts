/** Erro de sigilo sem detalhes que possam vazar senha, chave ou voto. */
export class SigiloCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SigiloCryptoError";
  }
}
