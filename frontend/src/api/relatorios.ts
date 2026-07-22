import { api } from "@/lib/api-client";
import type { CategoriaManutencao } from "@/types/domain";

export interface LinhaFinanceiro {
  mes: string;
  receitaPrevista: number;
  receitaRecebida: number;
  despesas: number;
  lucro: number;
}

export interface RelatorioFinanceiro {
  porMes: LinhaFinanceiro[];
  totais: { receitaPrevista: number; receitaRecebida: number; despesas: number; lucro: number };
}

export interface LinhaPorImovel {
  imovelId: string;
  endereco: string;
  receitaRecebida: number;
  gastosManutencao: number;
  rentabilidade: number;
}

export interface LinhaInadimplencia {
  mes: string;
  quantidade: number;
  valor: number;
}

export interface LinhaManutencaoCategoria {
  categoria: CategoriaManutencao;
  quantidade: number;
  valor: number;
}

export async function obterRelatorioFinanceiro(): Promise<RelatorioFinanceiro> {
  const { data } = await api.get("/relatorios/financeiro");
  return data;
}

export async function obterRelatorioPorImovel(): Promise<LinhaPorImovel[]> {
  const { data } = await api.get("/relatorios/por-imovel");
  return data;
}

export async function obterRelatorioInadimplencia(): Promise<LinhaInadimplencia[]> {
  const { data } = await api.get("/relatorios/inadimplencia");
  return data;
}

export async function obterRelatorioManutencaoPorCategoria(): Promise<LinhaManutencaoCategoria[]> {
  const { data } = await api.get("/relatorios/manutencao-por-categoria");
  return data;
}

// As rotas de relatorio exigem Bearer token (nao cookie), entao um <a href>
// direto nao enviaria o header de autenticacao. Baixa via axios (com o
// interceptor de token ja aplicado) e dispara o download no navegador a partir do blob.
export async function baixarExportacao(caminho: string, formato: "csv" | "pdf", nomeArquivo: string): Promise<void> {
  const resposta = await api.get(caminho, { params: { formato }, responseType: "blob" });
  const url = URL.createObjectURL(resposta.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
