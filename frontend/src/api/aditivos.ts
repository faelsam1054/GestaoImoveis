import { api } from "@/lib/api-client";
import { dispararDownloadBlob } from "@/lib/download";
import type { AditivoContrato } from "@/types/domain";

export interface AditivoInput {
  descricaoAlteracoes: string;
  valorAnterior?: number;
  valorNovo?: number;
  contratoAnteriorId?: string;
  arquivo: File;
}

export async function listarAditivos(contratoId: string): Promise<AditivoContrato[]> {
  const { data } = await api.get(`/contratos/${contratoId}/aditivos`);
  return data;
}

export async function criarAditivo(contratoId: string, input: AditivoInput): Promise<AditivoContrato> {
  const form = new FormData();
  form.append("arquivo", input.arquivo);
  form.append("descricaoAlteracoes", input.descricaoAlteracoes);
  if (input.valorAnterior !== undefined) form.append("valorAnterior", String(input.valorAnterior));
  if (input.valorNovo !== undefined) form.append("valorNovo", String(input.valorNovo));
  if (input.contratoAnteriorId) form.append("contratoAnteriorId", input.contratoAnteriorId);

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
