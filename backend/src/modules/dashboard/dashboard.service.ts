import { prisma } from "../../lib/prisma";
import { atualizarAtrasados } from "../pagamentos/pagamentos.service";

function competenciaDe(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function ultimosNMeses(n: number): string[] {
  const hoje = new Date();
  const meses: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    meses.push(competenciaDe(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)));
  }
  return meses;
}

const includeListaPagamento = {
  contrato: {
    include: {
      imovel: { select: { logradouro: true, numero: true } },
      inquilino: { include: { usuario: { select: { nome: true } } } },
    },
  },
} as const;

export async function resumo() {
  await atualizarAtrasados();

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
  const competenciaAtual = competenciaDe(hoje);
  const em7dias = new Date(hoje);
  em7dias.setDate(hoje.getDate() + 7);

  const [totalImoveis, imoveisPorStatus] = await Promise.all([
    prisma.imovel.count(),
    prisma.imovel.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const statusMap = Object.fromEntries(imoveisPorStatus.map((g) => [g.status, g._count._all]));

  const [receitaEsperadaAgg, receitaRecebidaAgg, despesaManutencaoAgg, despesaAdminAgg, inadimplenciaAgg] =
    await Promise.all([
      prisma.pagamento.aggregate({
        where: { competencia: competenciaAtual },
        _sum: { valorPrevisto: true },
      }),
      prisma.pagamento.aggregate({
        where: { competencia: competenciaAtual, status: "pago" },
        _sum: { valorPago: true },
      }),
      prisma.gastoManutencao.aggregate({
        where: { status: "pago", dataPagamento: { gte: inicioMes, lte: fimMes } },
        _sum: { valor: true },
      }),
      prisma.pagamentoAdministrador.aggregate({
        where: { status: "pago", dataPagamento: { gte: inicioMes, lte: fimMes } },
        _sum: { valorPago: true },
      }),
      prisma.pagamento.aggregate({
        where: { status: "atrasado" },
        _sum: { valorPrevisto: true },
        _count: { _all: true },
      }),
    ]);

  const [proximosVencimentos, pagamentosAtrasados, manutencoesPendentes] = await Promise.all([
    prisma.pagamento.findMany({
      where: { status: "pendente", dataVencimento: { gte: hoje, lte: em7dias } },
      include: includeListaPagamento,
      orderBy: { dataVencimento: "asc" },
      take: 10,
    }),
    prisma.pagamento.findMany({
      where: { status: "atrasado" },
      include: includeListaPagamento,
      orderBy: { dataVencimento: "asc" },
      take: 10,
    }),
    prisma.gastoManutencao.findMany({
      where: { status: { in: ["orcamento", "aprovado"] } },
      include: { imovel: { select: { logradouro: true, numero: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const receitaRecebidaMes = receitaRecebidaAgg._sum.valorPago ?? 0;
  const despesasMes = (despesaManutencaoAgg._sum.valor ?? 0) + (despesaAdminAgg._sum.valorPago ?? 0);

  return {
    imoveis: {
      total: totalImoveis,
      alugados: statusMap.alugado ?? 0,
      vagos: statusMap.vago ?? 0,
      emManutencao: statusMap.manutencao ?? 0,
      inativos: statusMap.inativo ?? 0,
    },
    financeiro: {
      receitaEsperadaMes: receitaEsperadaAgg._sum.valorPrevisto ?? 0,
      receitaRecebidaMes,
      despesasMes,
      lucroLiquidoMes: receitaRecebidaMes - despesasMes,
    },
    inadimplencia: {
      quantidade: inadimplenciaAgg._count._all,
      valor: inadimplenciaAgg._sum.valorPrevisto ?? 0,
    },
    proximosVencimentos,
    pagamentosAtrasados,
    manutencoesPendentes,
  };
}

export async function graficoReceitasDespesas() {
  const meses = ultimosNMeses(12);

  const [receitasPorMes, despesasAdminPorMes, gastosManutencaoPagos] = await Promise.all([
    prisma.pagamento.groupBy({
      by: ["competencia"],
      where: { competencia: { in: meses }, status: "pago" },
      _sum: { valorPago: true },
    }),
    prisma.pagamentoAdministrador.groupBy({
      by: ["mesReferencia"],
      where: { mesReferencia: { in: meses }, status: "pago" },
      _sum: { valorPago: true },
    }),
    prisma.gastoManutencao.findMany({
      where: { status: "pago", dataPagamento: { not: null } },
      select: { valor: true, dataPagamento: true },
    }),
  ]);

  const receitaMap = Object.fromEntries(receitasPorMes.map((r) => [r.competencia, r._sum.valorPago ?? 0]));
  const despesaAdminMap = Object.fromEntries(
    despesasAdminPorMes.map((d) => [d.mesReferencia, d._sum.valorPago ?? 0]),
  );

  const despesaManutencaoMap: Record<string, number> = {};
  for (const gasto of gastosManutencaoPagos) {
    const competencia = competenciaDe(gasto.dataPagamento!);
    despesaManutencaoMap[competencia] = (despesaManutencaoMap[competencia] ?? 0) + gasto.valor;
  }

  return meses.map((mes) => ({
    mes,
    receita: receitaMap[mes] ?? 0,
    despesa: (despesaAdminMap[mes] ?? 0) + (despesaManutencaoMap[mes] ?? 0),
  }));
}
