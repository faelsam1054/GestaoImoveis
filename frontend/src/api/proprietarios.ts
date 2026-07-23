import { api } from "@/lib/api-client";
import type { CredenciaisTemporarias } from "./inquilinos";
import type { Proprietario } from "@/types/domain";

export interface ProprietarioInput {
  nome: string;
  email: string;
  telefone?: string;
}

export type AtualizarProprietarioInput = Partial<ProprietarioInput>;

export async function listarProprietarios(): Promise<Proprietario[]> {
  const { data } = await api.get("/proprietarios");
  return data;
}

export async function criarProprietario(
  input: ProprietarioInput,
): Promise<{ proprietario: Proprietario; credenciaisTemporarias: CredenciaisTemporarias }> {
  const { data } = await api.post("/proprietarios", input);
  return data;
}

export async function atualizarProprietario(id: string, input: AtualizarProprietarioInput): Promise<Proprietario> {
  const { data } = await api.put(`/proprietarios/${id}`, input);
  return data;
}

export async function desativarProprietario(id: string): Promise<void> {
  await api.patch(`/proprietarios/${id}/desativar`);
}

export async function reativarProprietario(id: string): Promise<void> {
  await api.patch(`/proprietarios/${id}/reativar`);
}

export async function excluirProprietario(id: string): Promise<void> {
  await api.delete(`/proprietarios/${id}`);
}
