import { api } from "@/lib/api-client";
import type { Usuario } from "@/types/auth";
import type { CategoriaManutencao, Contrato, GastoManutencao, Imovel, Pagamento } from "@/types/domain";

export interface AtualizarPerfilInput {
  nome?: string;
  email?: string;
  telefone?: string;
  contatoEmergenciaNome?: string;
  contatoEmergenciaTelefone?: string;
}

export interface PerfilInquilino extends Usuario {
  inquilino?: {
    telefone: string;
    contatoEmergenciaNome: string | null;
    contatoEmergenciaTelefone: string | null;
  } | null;
}

export interface RelatarProblemaInput {
  descricao: string;
  categoria: CategoriaManutencao;
}

export async function obterMeuPerfil(): Promise<PerfilInquilino> {
  const { data } = await api.get("/me/perfil");
  return data;
}

export async function atualizarMeuPerfil(input: AtualizarPerfilInput): Promise<PerfilInquilino> {
  const { data } = await api.put("/me/perfil", input);
  return data;
}

export async function obterMeuImovel(): Promise<Imovel> {
  const { data } = await api.get("/me/imovel");
  return data;
}

export async function obterMeuContrato(): Promise<Contrato> {
  const { data } = await api.get("/me/contrato");
  return data;
}

export async function listarMeusPagamentos(): Promise<Pagamento[]> {
  const { data } = await api.get("/me/pagamentos");
  return data;
}

export async function relatarProblema(input: RelatarProblemaInput): Promise<GastoManutencao> {
  const { data } = await api.post("/me/manutencao", input);
  return data;
}
