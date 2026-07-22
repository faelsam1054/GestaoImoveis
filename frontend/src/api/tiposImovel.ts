import { api } from "@/lib/api-client";
import type { TipoImovel } from "@/types/domain";

export interface TipoImovelInput {
  nome: string;
  descricao?: string;
}

export async function listarTiposImovel(ativo?: boolean): Promise<TipoImovel[]> {
  const { data } = await api.get("/tipos-imovel", { params: ativo === undefined ? undefined : { ativo } });
  return data;
}

export async function criarTipoImovel(input: TipoImovelInput): Promise<TipoImovel> {
  const { data } = await api.post("/tipos-imovel", input);
  return data;
}

export async function atualizarTipoImovel(id: string, input: Partial<TipoImovelInput>): Promise<TipoImovel> {
  const { data } = await api.put(`/tipos-imovel/${id}`, input);
  return data;
}

export async function desativarTipoImovel(id: string): Promise<TipoImovel> {
  const { data } = await api.patch(`/tipos-imovel/${id}/desativar`);
  return data;
}

export async function reativarTipoImovel(id: string): Promise<TipoImovel> {
  const { data } = await api.patch(`/tipos-imovel/${id}/reativar`);
  return data;
}
