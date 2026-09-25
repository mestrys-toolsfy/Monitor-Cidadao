import { z } from "zod";

/**
 * O aceite do sigilo é obrigatório. `false` ou ausência recusa o avanço.
 * O backup da chave no servidor é um segundo opt-in, separado.
 */
export const consentimentoOnboardingSchema = z.object({
  aceitaSigilo: z.literal(true, { error: "É preciso aceitar o compromisso de sigilo." }),
  optInBackup: z.boolean(),
});

export type ConsentimentoOnboarding = z.infer<typeof consentimentoOnboardingSchema>;
