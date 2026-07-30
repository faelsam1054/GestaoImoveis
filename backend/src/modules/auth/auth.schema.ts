import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});

// Senha escolhida pelo proprio usuario (troca/redefinicao) - minimo 8
// caracteres com pelo menos uma letra e um numero.
const novaSenhaSchema = z
  .string()
  .min(8, "A senha deve ter no minimo 8 caracteres")
  .regex(/[a-zA-Z]/, "A senha deve conter pelo menos uma letra")
  .regex(/[0-9]/, "A senha deve conter pelo menos um numero");

export const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(6),
  novaSenha: novaSenhaSchema,
});

export const esqueciSenhaSchema = z.object({
  email: z.string().email(),
});

export const redefinirSenhaSchema = z.object({
  token: z.string(),
  novaSenha: novaSenhaSchema,
});
