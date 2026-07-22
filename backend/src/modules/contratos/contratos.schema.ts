import { z } from "zod";

export const criarContratoSchema = z
  .object({
    imovelId: z.string().min(1),
    inquilinoId: z.string().min(1),
    dataInicio: z.coerce.date(),
    dataFim: z.coerce.date(),
    diaVencimento: z.number().int().min(1).max(28),
    valorAluguel: z.number().positive(),
    valorCaucao: z.number().nonnegative().optional(),
  })
  .refine((d) => d.dataFim > d.dataInicio, {
    message: "dataFim deve ser posterior a dataInicio",
    path: ["dataFim"],
  });

export const renovarContratoSchema = z
  .object({
    dataInicio: z.coerce.date(),
    dataFim: z.coerce.date(),
    diaVencimento: z.number().int().min(1).max(28),
    valorAluguel: z.number().positive(),
    valorCaucao: z.number().nonnegative().optional(),
  })
  .refine((d) => d.dataFim > d.dataInicio, {
    message: "dataFim deve ser posterior a dataInicio",
    path: ["dataFim"],
  });

export const listarContratosQuerySchema = z.object({
  status: z.enum(["ativo", "encerrado", "rescindido", "renovado"]).optional(),
  imovelId: z.string().optional(),
  inquilinoId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
