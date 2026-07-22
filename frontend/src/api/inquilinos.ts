import { api } from "@/lib/api-client";
import type { Inquilino, Paginado } from "@/types/domain";

export interface InquilinoInput {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  contatoEmergenciaNome?: string;
  contatoEmergenciaTelefone?: string;
}

export interface CredenciaisTemporarias {
  email: string;
  senhaTemporaria: string;
}

export interface FiltrosInquilino {
  busca?: string;
  apenasExcluidos?: boolean;
}

export async function listarInquilinos(filtros: FiltrosInquilino = {}): Promise<Paginado<Inquilino>> {
  const { data } = await api.get("/inquilinos", { params: { ...filtros, pageSize: 100 } });
  return data;
}

export async function detalharInquilino(id: string): Promise<Inquilino> {
  const { data } = await api.get(`/inquilinos/${id}`);
  return data;
}

export async function criarInquilino(
  input: InquilinoInput,
): Promise<{ inquilino: Inquilino; credenciaisTemporarias: CredenciaisTemporarias }> {
  const { data } = await api.post("/inquilinos", input);
  return data;
}

export async function atualizarInquilino(
  id: string,
  input: Partial<Omit<InquilinoInput, "cpf">>,
): Promise<Inquilino> {
  const { data } = await api.put(`/inquilinos/${id}`, input);
  return data;
}

export async function desativarInquilino(id: string): Promise<void> {
  await api.delete(`/inquilinos/${id}`);
}

export async function ativarInquilino(id: string): Promise<void> {
  await api.patch(`/inquilinos/${id}/ativar`);
}

export async function excluirInquilino(id: string): Promise<void> {
  await api.patch(`/inquilinos/${id}/excluir`);
}

export async function restaurarInquilino(id: string): Promise<void> {
  await api.patch(`/inquilinos/${id}/restaurar`);
}

export async function resetarSenhaInquilino(
  id: string,
): Promise<{ credenciaisTemporarias: CredenciaisTemporarias }> {
  const { data } = await api.patch(`/inquilinos/${id}/resetar-senha`);
  return data;
}
