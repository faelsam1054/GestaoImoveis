import { z } from "zod";
import { STATUS_IMOVEL } from "../../constants/dominio";

export const criarImovelSchema = z.object({
  tipoImovelId: z.string().min(1),
  logradouro: z.string().min(1),
  numero: z.string().min(1),
  complemento: z.string().optional(),
  bairro: z.string().min(1),
  cidade: z.string().min(1),
  estado: z.string().length(2),
  cep: z.string().min(8).max(9),
  valorAluguelBase: z.number().positive(),
  descricao: z.string().optional(),
  status: z.enum(STATUS_IMOVEL).optional(),
});

export const atualizarImovelSchema = criarImovelSchema.partial();

export const listarImoveisQuerySchema = z.object({
  status: z.enum(STATUS_IMOVEL).optional(),
  tipoImovelId: z.string().optional(),
  busca: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  apenasExcluidos: z.coerce.boolean().optional(),
});
