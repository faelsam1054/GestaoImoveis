import { z } from "zod";
import { FORMA_PAGAMENTO_ADMIN } from "../../constants/dominio";

export const marcarPagoAdminSchema = z.object({
  valorPago: z.number().positive(),
  dataPagamento: z.coerce.date().optional(),
  formaPagamento: z.enum(FORMA_PAGAMENTO_ADMIN),
  observacoes: z.string().optional(),
});

export const listarPagamentosAdminQuerySchema = z.object({
  administradorId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export const calcularPagamentoAdminParamsSchema = z.object({
  administradorId: z.string().min(1),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/, "mesReferencia deve estar no formato YYYY-MM"),
});
