import { api } from "@/lib/api-client";
import { dispararDownloadBlob } from "@/lib/download";
import type { AditivoContrato } from "@/types/domain";

export interface AditivoInput {
  descricaoAlteracoes: string;
  dataAditivo?: string;
  valorAluguelNovo?: number;
  diaVencimentoNovo?: number;
  dataFimNova?: string;
  atualizarPagamentosFuturos?: boolean;
  atualizarDataVencimentoPendentes?: boolean;
  arquivo?: File;
}

// Usado so internamente pelo fluxo de renovacao (ContratosPage.tsx): o valor
// novo ja foi aplicado pelo proprio renovarContrato() no contrato recem-criado,
// entao aqui e so um registro historico com anterior/novo informados
// manualmente - nao deve disparar nenhuma escrita adicional no contrato.
export interface AditivoDocumentacaoInput {
  descricaoAlteracoes: string;
  valorAluguelAnterior?: number;
  valorAluguelNovo?: number;
  arquivo?: File;
}

export async function listarAditivos(contratoId: string): Promise<AditivoContrato[]> {
  const { data } = await api.get(`/contratos/${contratoId}/aditivos`);
  return data;
}

function montarFormData(input: Record<string, unknown>, arquivo?: File): FormData {
  const form = new FormData();
  if (arquivo) form.append("arquivo", arquivo);
  for (const [chave, valor] of Object.entries(input)) {
    if (valor !== undefined && valor !== null) form.append(chave, String(valor));
  }
  return form;
}

export async function criarAditivo(contratoId: string, input: AditivoInput): Promise<AditivoContrato> {
  const { arquivo, ...resto } = input;
  const form = montarFormData(resto, arquivo);
  const { data } = await api.post(`/contratos/${contratoId}/aditivo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function criarAditivoDocumentacao(
  contratoId: string,
  input: AditivoDocumentacaoInput,
): Promise<AditivoContrato> {
  const { arquivo, ...resto } = input;
  const form = montarFormData({ ...resto, aplicarNoContrato: false }, arquivo);
  const { data } = await api.post(`/contratos/${contratoId}/aditivo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function excluirAditivo(id: string): Promise<void> {
  await api.delete(`/aditivos/${id}`);
}

// Endpoint de download exige autenticacao (Bearer token), entao um <a href>
// simples nao funciona - busca como blob e dispara o download no navegador.
export async function baixarAditivo(id: string, nomeArquivo = "aditivo.pdf"): Promise<void> {
  const { data } = await api.get(`/aditivos/${id}/download`, { responseType: "blob" });
  dispararDownloadBlob(data as Blob, nomeArquivo);
}
