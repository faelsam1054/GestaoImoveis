import { z } from "zod";

export const criarContratoSchema = z
  .object({
    imovelId: z.string().min(1),
    inquilinoId: z.string().min(1),
    dataInicio: z.coerce.date(),
    dataFim: z.coerce.date(),
    diaVencimento: z.number().int().min(1).max(31),
    valorAluguel: z.number().positive(),
    valorCaucao: z.number().nonnegative().optional(),
    caucaoNumeroParcelas: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  })
  .refine((d) => d.dataFim > d.dataInicio, {
    message: "dataFim deve ser posterior a dataInicio",
    path: ["dataFim"],
  });

export const renovarContratoSchema = z
  .object({
    dataInicio: z.coerce.date(),
    dataFim: z.coerce.date(),
    diaVencimento: z.number().int().min(1).max(31),
    valorAluguel: z.number().positive(),
    valorCaucao: z.number().nonnegative().optional(),
    caucaoNumeroParcelas: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  })
  .refine((d) => d.dataFim > d.dataInicio, {
    message: "dataFim deve ser posterior a dataInicio",
    path: ["dataFim"],
  });

export const atualizarValoresContratoSchema = z
  .object({
    valorAluguel: z.number().positive().optional(),
    diaVencimento: z.number().int().min(1).max(31).optional(),
    // So tem efeito quando valorAluguel e informado - controla se o novo
    // valor tambem e aplicado aos Pagamentos tipo=aluguel ja pre-gerados
    // que ainda estao pendentes e vencem dai pra frente.
    atualizarPagamentosFuturos: z.boolean().optional().default(false),
  })
  .refine((d) => d.valorAluguel !== undefined || d.diaVencimento !== undefined, {
    message: "Informe ao menos um campo para atualizar (valorAluguel ou diaVencimento)",
  });

export const atualizarPagamentosLoteSchema = z.object({
  mesInicio: z.string().regex(/^\d{4}-\d{2}$/, "mesInicio deve estar no formato YYYY-MM"),
});

export const rejeitarContratoSchema = z.object({
  motivoRejeicao: z.string().min(3, "Informe o motivo da rejeição"),
});

export const listarContratosQuerySchema = z.object({
  // pendente_aprovacao/rejeitado nunca aparecem na listagem geral (ver
  // contratos.service.ts:listar), entao nao sao valores aceitos aqui.
  status: z.enum(["ativo", "encerrado"]).optional(),
  imovelId: z.string().optional(),
  inquilinoId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
