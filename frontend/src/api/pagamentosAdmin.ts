import { api } from "@/lib/api-client";
import type { FormaPagamentoAdmin, Paginado, PagamentoAdministrador } from "@/types/domain";

export interface PagamentoAdminInput {
  administradorId: string;
  mesReferencia: string;
  dataVencimento: string;
  observacoes?: string;
}

export interface MarcarPagoAdminInput {
  valorPago: number;
  dataPagamento?: string;
  formaPagamento: FormaPagamentoAdmin;
  observacoes?: string;
}

export async function listarPagamentosAdmin(administradorId?: string): Promise<Paginado<PagamentoAdministrador>> {
  const { data } = await api.get("/pagamentos-admin", { params: { administradorId, pageSize: 100 } });
  return data;
}

export async function criarPagamentoAdmin(input: PagamentoAdminInput): Promise<PagamentoAdministrador> {
  const { data } = await api.post("/pagamentos-admin", input);
  return data;
}

export async function marcarPagamentoAdminComoPago(
  id: string,
  input: MarcarPagoAdminInput,
): Promise<PagamentoAdministrador> {
  const { data } = await api.patch(`/pagamentos-admin/${id}/pagar`, input);
  return data;
}
