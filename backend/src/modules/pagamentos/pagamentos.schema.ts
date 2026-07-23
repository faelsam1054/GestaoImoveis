import { z } from "zod";
import { TIPO_PAGAMENTO, STATUS_PAGAMENTO, FORMA_PAGAMENTO } from "../../constants/dominio";

export const criarPagamentoAvulsoSchema = z.object({
  contratoId: z.string().min(1),
  tipo: z.enum(TIPO_PAGAMENTO),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, "competencia deve estar no formato YYYY-MM"),
  valorPrevisto: z.number().positive(),
  dataVencimento: z.coerce.date(),
  observacoes: z.string().optional(),
});

export const atualizarPagamentoSchema = z.object({
  valorPrevisto: z.number().positive().optional(),
  dataVencimento: z.coerce.date().optional(),
  observacoes: z.string().optional(),
});

export const marcarPagoSchema = z.object({
  valorPago: z.number().positive(),
  dataPagamento: z.coerce.date().optional(),
  formaPagamento: z.enum(FORMA_PAGAMENTO),
  observacoes: z.string().optional(),
});

export const desfazerPagamentoSchema = z.object({
  removerRecibo: z.boolean().default(true),
});

export const listarPagamentosQuerySchema = z.object({
  status: z.enum(STATUS_PAGAMENTO).optional(),
  contratoId: z.string().optional(),
  competencia: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
