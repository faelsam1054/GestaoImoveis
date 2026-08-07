import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import { PERCENTUAL_MENSALIDADE_ADMIN } from "../../constants/dominio";
import { inicioDeHoje } from "../../utils/data";
import type { marcarPagoAdminSchema } from "./pagamentos-admin.schema";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";

interface FiltrosPagamentoAdmin {
  administradorId?: string;
  page?: string;
  pageSize?: string;
}

const includePadrao = {
  administrador: { select: { id: true, nome: true, email: true } },
} satisfies Prisma.PagamentoAdministradorInclude;

// Imovel "ativo e visivel" - mesmo criterio do dashboard (AJUSTE 5): nao
// excluido e status != inativo. So esses contam para a mensalidade.
const imovelAtivoEVisivel = { excluidoEm: null, status: { not: "inativo" } } as const;

// Mesmo corte de inicioDeHoje() (nao instante atual) e mesma reversao
// bidirecional de pagamentos.service.ts:atualizarAtrasados.
async function atualizarAtrasados() {
  const hoje = inicioDeHoje();
  await Promise.all([
    prisma.pagamentoAdministrador.updateMany({
      where: { status: "aguardando_pagamento", dataVencimento: { lt: hoje } },
      data: { status: "atrasado" },
    }),
    prisma.pagamentoAdministrador.updateMany({
      where: { status: "atrasado", dataVencimento: { gte: hoje } },
      data: { status: "aguardando_pagamento" },
    }),
  ]);
}

export async function listar(filtros: FiltrosPagamentoAdmin) {
  await atualizarAtrasados();
  const paginacao = parsePaginacao(filtros);

  // Opcao A (ver AJUSTE 7 do polimento, documentado no README): mensalidades
  // de administradores desativados somem completamente da listagem, mas o
  // registro continua no banco (nao e hard delete, e so um filtro de leitura).
  const where: Prisma.PagamentoAdministradorWhereInput = {
    administradorId: filtros.administradorId,
    administrador: { ativo: true },
  };

  const [dados, total] = await Promise.all([
    prisma.pagamentoAdministrador.findMany({
      where,
      include: includePadrao,
      orderBy: { mesReferencia: "desc" },
      skip: paginacao.skip,
      take: paginacao.take,
    }),
    prisma.pagamentoAdministrador.count({ where }),
  ]);

  return paginar(dados, total, paginacao);
}

export async function buscarPorIdOuFalhar(id: string) {
  await atualizarAtrasados();
  const pagamento = await prisma.pagamentoAdministrador.findUnique({ where: { id }, include: includePadrao });
  if (!pagamento) throw new AppError("Mensalidade de administrador nao encontrada", 404);
  return pagamento;
}

// Mes de vencimento da mensalidade: dia 5 do mes seguinte ao mes de
// referencia (o administrador so recebe depois que o mes fecha e todos os
// inquilinos pagaram, entao vencer no mesmo mes nao faz sentido).
function calcularDataVencimento(mesReferencia: string): Date {
  const [ano, mes] = mesReferencia.split("-").map(Number);
  return new Date(ano, mes, 5); // mes (1-indexed) vira o mes seguinte em Date (0-indexed)
}

interface InquilinoPendente {
  imovelId: string;
  imovelEndereco: string;
  inquilinoNome: string;
  statusPagamento: string; // "pendente" | "atrasado" | "sem_registro"
}

export type ResultadoCalculo =
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
      registro: Prisma.PagamentoAdministradorGetPayload<{ include: typeof includePadrao }>;
    };

// Calculo lazy da mensalidade: le os imoveis vinculados ao administrador,
// verifica se todos os alugueis do mes ja foram pagos e, se sim, cria (ou
// retorna, se ja existir) o registro da mensalidade. Nunca cria duplicado
// (constraint unica administradorId+mesReferencia).
export async function calcular(administradorId: string, mesReferencia: string): Promise<ResultadoCalculo> {
  const administrador = await prisma.usuario.findUnique({ where: { id: administradorId } });
  // Administrador desativado e tratado como inexistente aqui (Opcao A, ver
  // README): nao vaza que ele existe mas esta inativo.
  if (!administrador || administrador.role !== "administrador" || !administrador.ativo) {
    throw new AppError("Administrador nao encontrado", 404);
  }

  const existente = await prisma.pagamentoAdministrador.findUnique({
    where: { administradorId_mesReferencia: { administradorId, mesReferencia } },
    include: includePadrao,
  });
  if (existente) {
    await atualizarAtrasados();
    const atualizado = await prisma.pagamentoAdministrador.findUniqueOrThrow({
      where: { id: existente.id },
      include: includePadrao,
    });
    return { existente: true, criadoAgora: false, status: atualizado.status, registro: atualizado };
  }

  const contratosAtivos = await prisma.contrato.findMany({
    where: {
      status: "ativo",
      imovel: { ...imovelAtivoEVisivel, administradoresVinculados: { some: { administradorId } } },
    },
    include: {
      imovel: { select: { id: true, logradouro: true, numero: true } },
      inquilino: { include: { usuario: { select: { nome: true } } } },
      pagamentos: { where: { tipo: "aluguel", competencia: mesReferencia } },
    },
  });

  const quantidadeImoveis = contratosAtivos.length;
  const valorTotalAlugueis = contratosAtivos.reduce((soma, c) => soma + c.valorAluguel, 0);
  const valorPrevisto = Math.round(valorTotalAlugueis * (PERCENTUAL_MENSALIDADE_ADMIN / 100) * 100) / 100;

  const inquilinosPendentes: InquilinoPendente[] = contratosAtivos
    .filter((c) => c.pagamentos[0]?.status !== "pago")
    .map((c) => ({
      imovelId: c.imovel.id,
      imovelEndereco: `${c.imovel.logradouro}, ${c.imovel.numero}`,
      inquilinoNome: c.inquilino.usuario.nome,
      statusPagamento: c.pagamentos[0]?.status ?? "sem_registro",
    }));

  if (quantidadeImoveis === 0) {
    return {
      existente: false,
      status: "sem_imoveis",
      administradorId,
      mesReferencia,
      quantidadeImoveis: 0,
      valorTotalAlugueis: 0,
      percentual: PERCENTUAL_MENSALIDADE_ADMIN,
      valorPrevisto: 0,
      inquilinosPendentes: [],
    };
  }

  if (inquilinosPendentes.length > 0) {
    return {
      existente: false,
      status: "aguardando_pagamento_inquilinos",
      administradorId,
      mesReferencia,
      quantidadeImoveis,
      valorTotalAlugueis,
      percentual: PERCENTUAL_MENSALIDADE_ADMIN,
      valorPrevisto,
      inquilinosPendentes,
    };
  }

  const criado = await prisma.pagamentoAdministrador.create({
    data: {
      administradorId,
      mesReferencia,
      quantidadeImoveis,
      valorTotalAlugueis,
      percentual: PERCENTUAL_MENSALIDADE_ADMIN,
      valorPrevisto,
      dataVencimento: calcularDataVencimento(mesReferencia),
      status: "aguardando_pagamento",
    },
    include: includePadrao,
  });

  return { existente: true, criadoAgora: true, status: criado.status, registro: criado };
}

export async function marcarComoPago(id: string, data: z.infer<typeof marcarPagoAdminSchema>) {
  const pagamento = await buscarPorIdOuFalhar(id);
  if (pagamento.status === "pago") {
    throw new AppError("Esta mensalidade ja esta marcada como paga", 409);
  }

  return prisma.pagamentoAdministrador.update({
    where: { id },
    data: {
      status: "pago",
      valorPago: data.valorPago,
      dataPagamento: data.dataPagamento ?? new Date(),
      formaPagamento: data.formaPagamento,
      observacoes: data.observacoes ?? pagamento.observacoes,
    },
    include: includePadrao,
  });
}

// Reverte um "marcar como pago" feito por engano - mesmo padrao de
// pagamentos.service.ts:desfazerPagamento.
export async function desfazerPagamento(id: string) {
  const pagamento = await buscarPorIdOuFalhar(id);
  if (pagamento.status !== "pago") {
    throw new AppError("Esta mensalidade nao esta marcada como paga", 409);
  }

  return prisma.pagamentoAdministrador.update({
    where: { id },
    data: { status: "aguardando_pagamento", valorPago: null, dataPagamento: null, formaPagamento: null },
    include: includePadrao,
  });
}
