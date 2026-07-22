import { z } from "zod";

export const listarAuditoriaQuerySchema = z.object({
  usuarioId: z.string().optional(),
  entidade: z.string().optional(),
  acao: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
