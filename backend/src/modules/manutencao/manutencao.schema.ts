import { z } from "zod";
import { CATEGORIA_MANUTENCAO, STATUS_MANUTENCAO, FORMA_PAGAMENTO, RECORRENCIA_MANUTENCAO } from "../../constants/dominio";

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
  recorrencia: z.enum(RECORRENCIA_MANUTENCAO).optional(),
  dataFimRecorrencia: z.coerce.date().optional(),
});

// Edicao completa (corrigir erro de cadastro): diferente de
// atualizarStatusManutencaoSchema (usado pelo fluxo rapido de avanco de
// status), aqui TODOS os campos - incluindo imovelId e status - podem ser
// alterados livremente, sem a regra de "nao retroceder status" (ver
// manutencao.service.ts: atualizar()).
export const atualizarGastoManutencaoSchema = z.object({
  imovelId: z.string().min(1).optional(),
  descricao: z.string().min(3).optional(),
  categoria: z.enum(CATEGORIA_MANUTENCAO).optional(),
  valor: z.number().positive().optional(),
  dataExecucao: z.coerce.date().nullable().optional(),
  prestadorNome: z.string().nullable().optional(),
  prestadorDocumento: z.string().nullable().optional(),
  prestadorTelefone: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  status: z.enum(STATUS_MANUTENCAO).optional(),
  dataPagamento: z.coerce.date().nullable().optional(),
  formaPagamento: z.enum(FORMA_PAGAMENTO).nullable().optional(),
  recorrencia: z.enum(RECORRENCIA_MANUTENCAO).optional(),
  dataFimRecorrencia: z.coerce.date().nullable().optional(),
});

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
  apenasExcluidos: z.coerce.boolean().optional(),
});
