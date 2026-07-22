import { z } from "zod";

export const criarAdministradorSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
});

export const atualizarAdministradorSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  ativo: z.boolean().optional(),
});

export const atualizarPermissoesSchema = z.object({
  podeVerImoveis: z.boolean().optional(),
  podeEditarImoveis: z.boolean().optional(),
  podeVerInquilinos: z.boolean().optional(),
  podeEditarInquilinos: z.boolean().optional(),
  podeVerContratos: z.boolean().optional(),
  podeEditarContratos: z.boolean().optional(),
  podeVerPagamentos: z.boolean().optional(),
  podeRegistrarPagamentos: z.boolean().optional(),
  podeVerManutencao: z.boolean().optional(),
  podeCadastrarManutencao: z.boolean().optional(),
  podeVerAdministradores: z.boolean().optional(),
  podeEditarPerfil: z.boolean().optional(),
});
