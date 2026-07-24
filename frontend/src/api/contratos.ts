import { api } from "@/lib/api-client";
import type { Contrato, Paginado, StatusContrato } from "@/types/domain";

export interface ContratoInput {
  imovelId: string;
  inquilinoId: string;
  dataInicio: string;
  dataFim: string;
  diaVencimento: number;
  valorAluguel: number;
  valorCaucao?: number;
  caucaoNumeroParcelas?: 1 | 2 | 3;
}

export type RenovarContratoInput = Omit<ContratoInput, "imovelId" | "inquilinoId">;

export interface FiltrosContrato {
  status?: StatusContrato;
  imovelId?: string;
  inquilinoId?: string;
}

export async function listarContratos(filtros: FiltrosContrato = {}): Promise<Paginado<Contrato>> {
  const { data } = await api.get("/contratos", { params: { ...filtros, pageSize: 100 } });
  return data;
}

export async function detalharContrato(id: string): Promise<Contrato> {
  const { data } = await api.get(`/contratos/${id}`);
  return data;
}

export async function criarContrato(input: ContratoInput): Promise<Contrato> {
  const { data } = await api.post("/contratos", input);
  return data;
}

export async function encerrarContrato(id: string): Promise<Contrato> {
  const { data } = await api.patch(`/contratos/${id}/encerrar`);
  return data;
}

export async function renovarContrato(id: string, input: RenovarContratoInput): Promise<Contrato> {
  const { data } = await api.post(`/contratos/${id}/renovar`, input);
  return data;
}

export async function enviarContratoAssinado(id: string, arquivo: File): Promise<Contrato> {
  const form = new FormData();
  form.append("arquivo", arquivo);
  const { data } = await api.post(`/contratos/${id}/contrato-assinado`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function removerContratoAssinado(id: string): Promise<Contrato> {
  const { data } = await api.delete(`/contratos/${id}/contrato-assinado`);
  return data;
}

export async function listarContratosPendentes(): Promise<Contrato[]> {
  const { data } = await api.get("/contratos/pendentes-aprovacao");
  return data;
}

export async function aprovarContrato(id: string): Promise<Contrato> {
  const { data } = await api.post(`/contratos/${id}/aprovar`);
  return data;
}

export async function rejeitarContrato(id: string, motivoRejeicao: string): Promise<Contrato> {
  const { data } = await api.post(`/contratos/${id}/rejeitar`, { motivoRejeicao });
  return data;
}

export async function excluirContrato(id: string): Promise<void> {
  await api.delete(`/contratos/${id}`);
}
