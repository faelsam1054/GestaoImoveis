import { api } from "@/lib/api-client";
import type { CategoriaManutencao, GastoManutencao, Paginado, StatusManutencao } from "@/types/domain";

export interface GastoManutencaoInput {
  imovelId: string;
  descricao: string;
  categoria: CategoriaManutencao;
  valor: number;
  dataExecucao?: string;
  prestadorNome?: string;
  prestadorDocumento?: string;
  prestadorTelefone?: string;
  observacoes?: string;
}

export interface FiltrosManutencao {
  imovelId?: string;
  status?: StatusManutencao;
  categoria?: CategoriaManutencao;
}

export async function listarManutencao(filtros: FiltrosManutencao = {}): Promise<Paginado<GastoManutencao>> {
  const { data } = await api.get("/manutencao", { params: { ...filtros, pageSize: 100 } });
  return data;
}

export async function detalharManutencao(id: string): Promise<GastoManutencao> {
  const { data } = await api.get(`/manutencao/${id}`);
  return data;
}

export async function criarManutencao(input: GastoManutencaoInput): Promise<GastoManutencao> {
  const { data } = await api.post("/manutencao", input);
  return data;
}

export async function atualizarManutencao(
  id: string,
  input: Partial<Omit<GastoManutencaoInput, "imovelId">>,
): Promise<GastoManutencao> {
  const { data } = await api.put(`/manutencao/${id}`, input);
  return data;
}

export async function atualizarStatusManutencao(id: string, status: StatusManutencao): Promise<GastoManutencao> {
  const { data } = await api.patch(`/manutencao/${id}/status`, { status });
  return data;
}

export async function anexarComprovanteManutencao(id: string, arquivo: File): Promise<GastoManutencao> {
  const form = new FormData();
  form.append("comprovante", arquivo);
  const { data } = await api.post(`/manutencao/${id}/comprovante`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
