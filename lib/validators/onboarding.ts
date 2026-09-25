import { z } from "zod";

/**
 * O aceite do sigilo é obrigatório. `false` ou ausência recusa o avanço.
 * O backup da chave no servidor é um segundo opt-in, separado.
 * O check de `consentimentos.finalidade` aceita qualquer texto não vazio,
 * então o uso da plataforma pode ser outra finalidade sem migração.
 * A linha `backup_chave_cifrada` só existe se a pessoa marcar o opt-in.
 */
export const consentimentoOnboardingSchema = z.object({
  aceitaSigilo: z.literal(true, { error: "É preciso aceitar o compromisso de sigilo." }),
  optInBackup: z.boolean(),
});

/** Senha da conta. Não é a senha de sigilo e não entra no voto. */
export const entradaContaSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }),
  senha: z.string().min(6, { error: "A senha da conta precisa ter pelo menos 6 caracteres." }),
});

export type ConsentimentoOnboarding = z.infer<typeof consentimentoOnboardingSchema>;
