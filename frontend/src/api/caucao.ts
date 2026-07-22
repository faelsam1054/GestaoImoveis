import { api } from "@/lib/api-client";
import type { CaucaoParcela, FormaPagamentoCaucao } from "@/types/domain";

export interface PagarParcelaCaucaoInput {
  dataPagamento?: string;
  formaPagamento: FormaPagamentoCaucao;
  observacoes?: string;
}

export interface ParcelaCaucaoInput {
  id?: string;
  numeroParcela: number;
  valorParcela: number;
  dataVencimento: string;
  observacoes?: string;
}

export async function listarParcelasCaucao(contratoId: string): Promise<CaucaoParcela[]> {
  const { data } = await api.get(`/contratos/${contratoId}/caucao`);
  return data;
}

export async function pagarParcelaCaucao(
  contratoId: string,
  parcelaId: string,
  input: PagarParcelaCaucaoInput,
): Promise<CaucaoParcela> {
  const { data } = await api.post(`/contratos/${contratoId}/caucao/${parcelaId}/pagar`, input);
  return data;
}

export async function atualizarParcelasCaucao(
  contratoId: string,
  parcelas: ParcelaCaucaoInput[],
): Promise<CaucaoParcela[]> {
  const { data } = await api.put(`/contratos/${contratoId}/caucao`, { parcelas });
  return data;
}

export async function removerParcelaCaucao(contratoId: string, parcelaId: string): Promise<void> {
  await api.delete(`/contratos/${contratoId}/caucao/${parcelaId}`);
}
