import { z } from "zod";

export const pagarParcelaCaucaoSchema = z.object({
  dataPagamento: z.coerce.date().optional(),
  formaPagamento: z.enum(["pix", "transferencia", "dinheiro", "outros"]),
  observacoes: z.string().optional(),
});

export const atualizarParcelasCaucaoSchema = z.object({
  parcelas: z
    .array(
      z.object({
        id: z.string().optional(),
        numeroParcela: z.number().int().min(1).max(3),
        valorParcela: z.number().positive(),
        dataVencimento: z.coerce.date(),
        observacoes: z.string().optional(),
      }),
    )
    .min(1),
});
