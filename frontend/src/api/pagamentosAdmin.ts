import { api } from "@/lib/api-client";
import type { FormaPagamentoAdmin, Paginado, PagamentoAdministrador } from "@/types/domain";

export interface MarcarPagoAdminInput {
  valorPago: number;
  dataPagamento?: string;
  formaPagamento: FormaPagamentoAdmin;
  observacoes?: string;
}

export interface InquilinoPendente {
  imovelId: string;
  imovelEndereco: string;
  inquilinoNome: string;
  statusPagamento: string;
}

export type ResultadoCalculoPagamentoAdmin =
  | {
      existente: false;
      status: "sem_imoveis" | "aguardando_pagamento_inquilinos";
      administradorId: string;
      mesReferencia: string;
      quantidadeImoveis: number;
      valorTotalAlugueis: number;
      percentual: number;
      valorPrevisto: number;
      inquilinosPendentes: InquilinoPendente[];
    }
  | {
      existente: true;
      criadoAgora: boolean;
      status: string;
      registro: PagamentoAdministrador;
    };

export async function listarPagamentosAdmin(administradorId?: string): Promise<Paginado<PagamentoAdministrador>> {
  const { data } = await api.get("/pagamentos-admin", { params: { administradorId, pageSize: 100 } });
  return data;
}

export async function calcularPagamentoAdmin(
  administradorId: string,
  mesReferencia: string,
): Promise<ResultadoCalculoPagamentoAdmin> {
  const { data } = await api.get(`/pagamentos-admin/calcular/${administradorId}/${mesReferencia}`);
  return data;
}

export async function marcarPagamentoAdminComoPago(
  id: string,
  input: MarcarPagoAdminInput,
): Promise<PagamentoAdministrador> {
  const { data } = await api.patch(`/pagamentos-admin/${id}/pagar`, input);
  return data;
}

export async function desfazerPagamentoAdmin(id: string): Promise<PagamentoAdministrador> {
  const { data } = await api.post(`/pagamentos-admin/${id}/desfazer-pagamento`);
  return data;
}
