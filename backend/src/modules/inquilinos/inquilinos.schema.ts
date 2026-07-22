import { z } from "zod";

export const criarInquilinoSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  cpf: z.string().min(11).max(14),
  telefone: z.string().min(8),
  contatoEmergenciaNome: z.string().optional(),
  contatoEmergenciaTelefone: z.string().optional(),
});

export const atualizarInquilinoSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefone: z.string().min(8).optional(),
  contatoEmergenciaNome: z.string().optional(),
  contatoEmergenciaTelefone: z.string().optional(),
});

export const listarInquilinosQuerySchema = z.object({
  busca: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  apenasExcluidos: z.coerce.boolean().optional(),
});
