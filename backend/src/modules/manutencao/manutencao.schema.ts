import { z } from "zod";
import { CATEGORIA_MANUTENCAO, STATUS_MANUTENCAO } from "../../constants/dominio";

export const criarGastoManutencaoSchema = z.object({
  imovelId: z.string().min(1),
  descricao: z.string().min(3),
  categoria: z.enum(CATEGORIA_MANUTENCAO),
  valor: z.number().nonnegative(),
  dataExecucao: z.coerce.date().optional(),
  prestadorNome: z.string().optional(),
  prestadorDocumento: z.string().optional(),
  prestadorTelefone: z.string().optional(),
  observacoes: z.string().optional(),
});

export const atualizarGastoManutencaoSchema = criarGastoManutencaoSchema.partial().omit({ imovelId: true });

export const atualizarStatusManutencaoSchema = z.object({
  status: z.enum(STATUS_MANUTENCAO),
  dataPagamento: z.coerce.date().optional(),
});

export const listarManutencaoQuerySchema = z.object({
  imovelId: z.string().optional(),
  status: z.enum(STATUS_MANUTENCAO).optional(),
  categoria: z.enum(CATEGORIA_MANUTENCAO).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
