import { z } from "zod";

export const criarTipoImovelSchema = z.object({
  nome: z.string().min(2).max(60),
  descricao: z.string().max(255).optional(),
});

export const atualizarTipoImovelSchema = criarTipoImovelSchema.partial();

export const listarTiposImovelQuerySchema = z.object({
  ativo: z.enum(["true", "false"]).optional(),
});
