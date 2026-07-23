import { api } from "@/lib/api-client";
import { dispararDownloadBlob } from "@/lib/download";
import type {
  CategoriaManutencao,
  FormaPagamento,
  GastoManutencao,
  Paginado,
  StatusManutencao,
  RecorrenciaManutencao,
} from "@/types/domain";

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
  recorrencia?: RecorrenciaManutencao;
  dataFimRecorrencia?: string;
}

export interface AtualizarGastoManutencaoInput extends Partial<GastoManutencaoInput> {
  status?: StatusManutencao;
  dataPagamento?: string | null;
  formaPagamento?: FormaPagamento | null;
  dataFimRecorrencia?: string | null;
}

export interface FiltrosManutencao {
  imovelId?: string;
  status?: StatusManutencao;
  categoria?: CategoriaManutencao;
  apenasExcluidos?: boolean;
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

export async function atualizarManutencao(id: string, input: AtualizarGastoManutencaoInput): Promise<GastoManutencao> {
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

export async function removerComprovanteManutencao(id: string): Promise<GastoManutencao> {
  const { data } = await api.delete(`/manutencao/${id}/comprovante`);
  return data;
}

export async function excluirManutencao(id: string): Promise<void> {
  await api.delete(`/manutencao/${id}`);
}

// Endpoint de comprovante exige autenticacao, entao busca como blob para
// poder tanto pre-visualizar (react-pdf) quanto disparar o download.
export async function obterComprovanteBlob(id: string): Promise<Blob> {
  const { data } = await api.get(`/manutencao/${id}/comprovante`, { responseType: "blob" });
  return data;
}

export async function baixarComprovanteManutencao(id: string, nomeArquivo = "comprovante.pdf"): Promise<void> {
  const blob = await obterComprovanteBlob(id);
  dispararDownloadBlob(blob, nomeArquivo);
}

export async function pausarRecorrenciaManutencao(id: string): Promise<GastoManutencao> {
  const { data } = await api.patch(`/manutencao/${id}/pausar-recorrencia`);
  return data;
}

export async function retomarRecorrenciaManutencao(id: string): Promise<GastoManutencao> {
  const { data } = await api.patch(`/manutencao/${id}/retomar-recorrencia`);
  return data;
}

export async function listarRecorrenciasManutencao(id: string): Promise<GastoManutencao[]> {
  const { data } = await api.get(`/manutencao/${id}/recorrencias`);
  return data;
}
