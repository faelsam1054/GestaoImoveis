import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});

export const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(6),
  novaSenha: z.string().min(8),
});

export const esqueciSenhaSchema = z.object({
  email: z.string().email(),
});

export const redefinirSenhaSchema = z.object({
  token: z.string(),
  novaSenha: z.string().min(8),
});
