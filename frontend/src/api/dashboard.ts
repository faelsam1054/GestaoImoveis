import { api } from "@/lib/api-client";
import type { GastoManutencao, Pagamento } from "@/types/domain";

export interface ResumoDashboard {
  imoveis: { total: number; alugados: number; vagos: number; emManutencao: number; inativos: number };
  financeiro: {
    receitaEsperadaMes: number;
    receitaRecebidaMes: number;
    despesasMes: number;
    lucroLiquidoMes: number;
  };
  inadimplencia: { quantidade: number; valor: number };
  proximosVencimentos: Pagamento[];
  pagamentosAtrasados: Pagamento[];
  manutencoesPendentes: GastoManutencao[];
}

export interface PontoGraficoFinanceiro {
  mes: string;
  receita: number;
  despesa: number;
}

export async function obterResumoDashboard(): Promise<ResumoDashboard> {
  const { data } = await api.get("/dashboard/resumo");
  return data;
}

export async function obterGraficoReceitasDespesas(): Promise<PontoGraficoFinanceiro[]> {
  const { data } = await api.get("/dashboard/grafico-receitas-despesas");
  return data;
}
