import { z } from "zod";

export const criarProprietarioSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  telefone: z.string().optional(),
});

export const atualizarProprietarioSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
});
