import { api } from "@/lib/api-client";
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
