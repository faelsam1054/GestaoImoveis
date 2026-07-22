import { api } from "@/lib/api-client";
import type { Imovel, Paginado, StatusImovel } from "@/types/domain";

export interface ImovelInput {
  tipoImovelId: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  valorAluguelBase: number;
  descricao?: string;
  status?: StatusImovel;
}

export interface FiltrosImovel {
  status?: StatusImovel;
  tipoImovelId?: string;
  busca?: string;
  page?: number;
  pageSize?: number;
  apenasExcluidos?: boolean;
}

export async function listarImoveis(filtros: FiltrosImovel = {}): Promise<Paginado<Imovel>> {
  const { data } = await api.get("/imoveis", { params: filtros });
  return data;
}

export async function detalharImovel(id: string): Promise<Imovel> {
  const { data } = await api.get(`/imoveis/${id}`);
  return data;
}

export async function criarImovel(input: ImovelInput): Promise<Imovel> {
  const { data } = await api.post("/imoveis", input);
  return data;
}

export async function atualizarImovel(id: string, input: Partial<ImovelInput>): Promise<Imovel> {
  const { data } = await api.put(`/imoveis/${id}`, input);
  return data;
}

export async function removerImovel(id: string): Promise<void> {
  await api.delete(`/imoveis/${id}`);
}

export async function restaurarImovel(id: string): Promise<void> {
  await api.patch(`/imoveis/${id}/restaurar`);
}

export async function ativarImovel(id: string): Promise<Imovel> {
  const { data } = await api.patch(`/imoveis/${id}/ativar`);
  return data;
}

export async function desativarImovel(id: string): Promise<Imovel> {
  const { data } = await api.patch(`/imoveis/${id}/desativar`);
  return data;
}

export async function adicionarFotoImovel(id: string, arquivo: File) {
  const form = new FormData();
  form.append("foto", arquivo);
  const { data } = await api.post(`/imoveis/${id}/fotos`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function removerFotoImovel(imovelId: string, fotoId: string): Promise<void> {
  await api.delete(`/imoveis/${imovelId}/fotos/${fotoId}`);
}
