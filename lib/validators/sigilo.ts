import { z } from "zod";

/** Senha de sigilo, distinta da senha de login. Mínimo de 12 caracteres. */
export const senhaSigiloSchema = z.string().min(12, "A senha de sigilo precisa ter pelo menos 12 caracteres.");
