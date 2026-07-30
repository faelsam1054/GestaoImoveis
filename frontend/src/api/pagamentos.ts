import { api } from "@/lib/api-client";
import { dispararDownloadBlob } from "@/lib/download";
import type { FormaPagamento, Paginado, Pagamento, StatusPagamento, TipoPagamento } from "@/types/domain";

export interface PagamentoAvulsoInput {
  contratoId: string;
  tipo: TipoPagamento;
  competencia: string;
  valorPrevisto: number;
  dataVencimento: string;
  observacoes?: string;
}

export interface MarcarPagoInput {
  valorPago: number;
  dataPagamento?: string;
  formaPagamento: FormaPagamento;
  observacoes?: string;
}

export interface FiltrosPagamento {
  status?: StatusPagamento;
  contratoId?: string;
  competencia?: string;
  imovelId?: string;
  dataInicio?: string;
  dataFim?: string;
  ordenarPor?: "dataVencimento" | "valor";
  ordem?: "asc" | "desc";
  pageSize?: number;
}

export async function listarPagamentos(filtros: FiltrosPagamento = {}): Promise<Paginado<Pagamento>> {
  const { data } = await api.get("/pagamentos", { params: { pageSize: 100, ...filtros } });
  return data;
}

export async function detalharPagamento(id: string): Promise<Pagamento> {
  const { data } = await api.get(`/pagamentos/${id}`);
  return data;
}

export async function criarPagamentoAvulso(input: PagamentoAvulsoInput): Promise<Pagamento> {
  const { data } = await api.post("/pagamentos", input);
  return data;
}

export async function atualizarPagamento(
  id: string,
  input: Partial<Pick<PagamentoAvulsoInput, "valorPrevisto" | "dataVencimento" | "observacoes">>,
): Promise<Pagamento> {
  const { data } = await api.put(`/pagamentos/${id}`, input);
  return data;
}

export async function marcarPagamentoComoPago(id: string, input: MarcarPagoInput): Promise<Pagamento> {
  const { data } = await api.patch(`/pagamentos/${id}/pagar`, input);
  return data;
}

export async function desfazerPagamento(id: string, removerRecibo: boolean): Promise<Pagamento> {
  const { data } = await api.post(`/pagamentos/${id}/desfazer-pagamento`, { removerRecibo });
  return data;
}

export async function anexarComprovantePagamento(id: string, arquivo: File): Promise<Pagamento> {
  const form = new FormData();
  form.append("comprovante", arquivo);
  const { data } = await api.post(`/pagamentos/${id}/comprovante`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function removerComprovantePagamento(id: string): Promise<Pagamento> {
  const { data } = await api.delete(`/pagamentos/${id}/comprovante`);
  return data;
}

// Endpoint de comprovante exige autenticacao, entao busca como blob para
// poder tanto pre-visualizar (imagem/PDF) quanto disparar o download.
export async function obterComprovantePagamentoBlob(id: string): Promise<Blob> {
  const { data } = await api.get(`/pagamentos/${id}/comprovante`, { responseType: "blob" });
  return data;
}

export async function baixarComprovantePagamento(id: string, nomeArquivo = "comprovante"): Promise<void> {
  const blob = await obterComprovantePagamentoBlob(id);
  dispararDownloadBlob(blob, nomeArquivo);
}
