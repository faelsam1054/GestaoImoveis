import { prisma } from "../../lib/prisma";

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

export async function financeiro(meses = 12) {
  const competencias = ultimosNMeses(meses);

  const [receitaPrevistaPorMes, receitaRecebidaPorMes, despesaAdminPorMes, gastosManutencaoPagos] =
    await Promise.all([
      // tipo: "aluguel" - caucao e deposito de garantia, nao receita. Pago
      // sempre conta; pendente/atrasado so conta se o contrato ainda esta
      // ativo (mesmo criterio e mesmo motivo de dashboard.service.ts:
      // Pagamento futuro pre-gerado de contrato ja encerrado/rejeitado nunca
      // sera cobrado e nao deveria aparecer como receita prevista).
      prisma.pagamento.groupBy({
        by: ["competencia"],
        where: {
          competencia: { in: competencias },
          tipo: "aluguel",
          OR: [{ status: "pago" }, { status: { in: ["pendente", "atrasado"] }, contrato: { status: "ativo" } }],
        },
        _sum: { valorPrevisto: true },
      }),
      prisma.pagamento.groupBy({
        by: ["competencia"],
        where: { competencia: { in: competencias }, tipo: "aluguel", status: "pago" },
        _sum: { valorPago: true },
      }),
      prisma.pagamentoAdministrador.groupBy({
        by: ["mesReferencia"],
        where: { mesReferencia: { in: competencias }, status: "pago" },
        _sum: { valorPago: true },
      }),
      prisma.gastoManutencao.findMany({
        where: { status: "pago", dataPagamento: { not: null } },
        select: { valor: true, dataPagamento: true },
      }),
    ]);

  const receitaPrevistaMap = Object.fromEntries(
    receitaPrevistaPorMes.map((r) => [r.competencia, r._sum.valorPrevisto ?? 0]),
  );
  const receitaRecebidaMap = Object.fromEntries(
    receitaRecebidaPorMes.map((r) => [r.competencia, r._sum.valorPago ?? 0]),
  );
  const despesaAdminMap = Object.fromEntries(despesaAdminPorMes.map((d) => [d.mesReferencia, d._sum.valorPago ?? 0]));

  const despesaManutencaoMap: Record<string, number> = {};
  for (const gasto of gastosManutencaoPagos) {
    const competencia = competenciaDe(gasto.dataPagamento!);
    despesaManutencaoMap[competencia] = (despesaManutencaoMap[competencia] ?? 0) + gasto.valor;
  }

  const porMes = competencias.map((mes) => {
    const receitaPrevista = receitaPrevistaMap[mes] ?? 0;
    const receitaRecebida = receitaRecebidaMap[mes] ?? 0;
    const despesas = (despesaAdminMap[mes] ?? 0) + (despesaManutencaoMap[mes] ?? 0);
    return { mes, receitaPrevista, receitaRecebida, despesas, lucro: receitaRecebida - despesas };
  });

  const totais = porMes.reduce(
    (acc, m) => ({
      receitaPrevista: acc.receitaPrevista + m.receitaPrevista,
      receitaRecebida: acc.receitaRecebida + m.receitaRecebida,
      despesas: acc.despesas + m.despesas,
      lucro: acc.lucro + m.lucro,
    }),
    { receitaPrevista: 0, receitaRecebida: 0, despesas: 0, lucro: 0 },
  );

  return { porMes, totais };
}

export async function porImovel() {
  const imoveis = await prisma.imovel.findMany({
    include: {
      contratos: { include: { pagamentos: { where: { status: "pago", tipo: "aluguel" } } } },
      gastosManutencao: { where: { status: "pago" } },
    },
    orderBy: { logradouro: "asc" },
  });

  const linhas = imoveis.map((imovel) => {
    const receitaRecebida = imovel.contratos.reduce(
      (soma, contrato) => soma + contrato.pagamentos.reduce((s, p) => s + (p.valorPago ?? 0), 0),
      0,
    );
    const gastosManutencao = imovel.gastosManutencao.reduce((soma, g) => soma + g.valor, 0);

    return {
      imovelId: imovel.id,
      endereco: `${imovel.logradouro}, ${imovel.numero} - ${imovel.bairro}`,
      receitaRecebida,
      gastosManutencao,
      rentabilidade: receitaRecebida - gastosManutencao,
    };
  });

  return linhas.sort((a, b) => b.rentabilidade - a.rentabilidade);
}

// Historico de inadimplencia dos ultimos N meses: para cada competencia,
// quantidade e valor dos pagamentos que estao (ou ficaram) em atraso.
export async function inadimplencia(meses = 12) {
  const competencias = ultimosNMeses(meses);

  const atrasados = await prisma.pagamento.groupBy({
    by: ["competencia"],
    where: { competencia: { in: competencias }, status: "atrasado" },
    _sum: { valorPrevisto: true },
    _count: { _all: true },
  });

  const mapa = new Map(atrasados.map((a) => [a.competencia, a]));

  return competencias.map((mes) => ({
    mes,
    quantidade: mapa.get(mes)?._count._all ?? 0,
    valor: mapa.get(mes)?._sum.valorPrevisto ?? 0,
  }));
}

export async function manutencaoPorCategoria() {
  const grupos = await prisma.gastoManutencao.groupBy({
    by: ["categoria"],
    where: { status: "pago" },
    _sum: { valor: true },
    _count: { _all: true },
  });

  return grupos
    .map((g) => ({ categoria: g.categoria, quantidade: g._count._all, valor: g._sum.valor ?? 0 }))
    .sort((a, b) => b.valor - a.valor);
}
