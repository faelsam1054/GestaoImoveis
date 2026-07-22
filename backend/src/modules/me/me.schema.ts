import { z } from "zod";
import { CATEGORIA_MANUTENCAO } from "../../constants/dominio";

export const atualizarPerfilSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefone: z.string().min(8).optional(),
  contatoEmergenciaNome: z.string().optional(),
  contatoEmergenciaTelefone: z.string().optional(),
});

export const relatarProblemaSchema = z.object({
  descricao: z.string().min(5),
  categoria: z.enum(CATEGORIA_MANUTENCAO),
});
