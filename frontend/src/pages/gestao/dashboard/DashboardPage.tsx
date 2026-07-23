import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, TrendingDown, TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import { obterResumoDashboard, obterGraficoReceitasDespesas } from "@/api/dashboard";
import { formatarCompetencia, formatarData, formatarMoeda } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { ReceitaDespesaChart } from "@/components/charts/receita-despesa-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPage() {
  const { data: resumo, isLoading: carregandoResumo } = useQuery({
    queryKey: ["dashboard", "resumo"],
    queryFn: obterResumoDashboard,
  });
  const { data: grafico, isLoading: carregandoGrafico } = useQuery({
    queryKey: ["dashboard", "grafico"],
    queryFn: obterGraficoReceitasDespesas,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titulo="Dashboard" descricao="Visão geral do mês atual." />

      {carregandoResumo || !resumo ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Imóveis"
              value={`${resumo.imoveis.alugados} alugados / ${resumo.imoveis.total} total`}
              icon={<Building2 className="h-5 w-5" />}
            />
            <StatTile
              label="Receita recebida (mês)"
              value={formatarMoeda(resumo.financeiro.receitaRecebidaMes)}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="success"
            />
            <StatTile
              label="Despesas (mês)"
              value={formatarMoeda(resumo.financeiro.despesasMes)}
              icon={<TrendingDown className="h-5 w-5" />}
              tone="critical"
            />
            <StatTile
              label="Lucro líquido (mês)"
              value={formatarMoeda(resumo.financeiro.lucroLiquidoMes)}
              icon={<Wallet className="h-5 w-5" />}
              tone={resumo.financeiro.lucroLiquidoMes >= 0 ? "success" : "critical"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Vagos" value={String(resumo.imoveis.vagos)} />
            <StatTile label="Em manutenção" value={String(resumo.imoveis.emManutencao)} />
            <StatTile
              label="Receita esperada (mês)"
              value={formatarMoeda(resumo.financeiro.receitaEsperadaMes)}
            />
            <StatTile
              label="Inadimplência"
              value={`${resumo.inadimplencia.quantidade} pagamento(s) - ${formatarMoeda(resumo.inadimplencia.valor)}`}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone={resumo.inadimplencia.quantidade > 0 ? "critical" : "default"}
            />
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Receitas x Despesas (últimos 12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {carregandoGrafico || !grafico ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <ReceitaDespesaChart dados={grafico} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos vencimentos (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {resumo?.proximosVencimentos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum vencimento nos próximos 7 dias.</p>
            )}
            {resumo?.proximosVencimentos.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{p.contrato?.imovel?.logradouro}</p>
                  <p className="text-xs text-muted-foreground">{formatarData(p.dataVencimento)}</p>
                </div>
                <span className="font-medium">{formatarMoeda(p.valorPrevisto)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagamentos atrasados</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {resumo?.pagamentosAtrasados.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum pagamento em atraso.</p>
            )}
            {resumo?.pagamentosAtrasados.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{p.contrato?.imovel?.logradouro}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.contrato?.inquilino?.usuario?.nome} - {formatarCompetencia(p.competencia)}
                  </p>
                </div>
                <span className="font-medium text-destructive">{formatarMoeda(p.valorPrevisto)}</span>
              </div>
            ))}
            <Link to="/pagamentos" className="text-xs text-primary hover:underline">
              Ver todos os pagamentos →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manutenções pendentes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {resumo?.manutencoesPendentes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma manutenção pendente.</p>
            )}
            {resumo?.manutencoesPendentes.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{g.descricao}</p>
                  <p className="text-xs text-muted-foreground">{g.imovel?.logradouro}</p>
                </div>
                <StatusBadge status={g.status} />
              </div>
            ))}
            <Link to="/manutencao" className="text-xs text-primary hover:underline">
              Ver todas as manutenções →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
