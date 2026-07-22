import { z } from "zod";

export const relatorioQuerySchema = z.object({
  meses: z.coerce.number().int().min(1).max(36).optional(),
  formato: z.enum(["json", "csv", "pdf"]).optional().default("json"),
});
