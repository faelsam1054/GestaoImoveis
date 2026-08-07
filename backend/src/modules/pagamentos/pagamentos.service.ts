import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import { gerarReciboPdf } from "../../services/pdf/recibo.pdf";
import { removerArquivo } from "../../lib/storage";
import { inicioDeHoje } from "../../utils/data";
import type {
  criarPagamentoAvulsoSchema,
  atualizarPagamentoSchema,
  marcarPagoSchema,
  desfazerPagamentoSchema,
} from "./pagamentos.schema";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";

interface FiltrosPagamento {
  status?: string;
  contratoId?: string;
  competencia?: string;
  imovelId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  ordenarPor?: "dataVencimento" | "valor";
  ordem?: "asc" | "desc";
  page?: string;
  pageSize?: string;
  imovelIdsPermitidos?: string[] | null;
}

const includePadrao = {
  contrato: {
    include: {
      imovel: { select: { id: true, logradouro: true, numero: true, bairro: true, cidade: true, estado: true } },
      inquilino: { include: { usuario: { select: { nome: true, email: true } } } },
    },
  },
  recibo: true,
} satisfies Prisma.PagamentoInclude;

// Atualizacao "preguicosa": nao ha job/cron agendado, entao qualquer leitura
// de pagamentos primeiro reclassifica pendente/atrasado com base na data
// atual. Bidirecional: promove pendente vencido para atrasado, mas tambem
// reverte atrasado cujo vencimento foi prorrogado para o futuro de volta
// para pendente (ex: proprietario mudou o dia de vencimento do contrato -
// ver atualizarValores em contratos.service.ts). Pago/cancelado nunca mudam.
// Corte e inicioDeHoje() (meia-noite), nao o instante atual: um pagamento so
// conta como atrasado a partir do dia SEGUINTE ao vencimento - no proprio
// dia do vencimento ele continua "pendente".
export async function atualizarAtrasados() {
  const hoje = inicioDeHoje();
  const [paraAtrasado, paraPendente] = await Promise.all([
    prisma.pagamento.updateMany({
      where: { status: "pendente", dataVencimento: { lt: hoje } },
      data: { status: "atrasado" },
    }),
    prisma.pagamento.updateMany({
      where: { status: "atrasado", dataVencimento: { gte: hoje } },
      data: { status: "pendente" },
    }),
  ]);
  return paraAtrasado.count + paraPendente.count;
}

export async function listar(filtros: FiltrosPagamento) {
  await atualizarAtrasados();
  const paginacao = parsePaginacao(filtros);

  const contratoClausulas: Prisma.ContratoWhereInput[] = [];
  if (filtros.imovelIdsPermitidos) contratoClausulas.push({ imovelId: { in: filtros.imovelIdsPermitidos } });
  if (filtros.imovelId) contratoClausulas.push({ imovelId: filtros.imovelId });

  // Periodo cobre vencimento OU pagamento (so quando ja pago) - permite achar
  // tanto "o que vencia em janeiro" quanto "o que foi pago em janeiro".
  let periodoWhere: Prisma.PagamentoWhereInput | undefined;
  if (filtros.dataInicio || filtros.dataFim) {
    const fimExclusivo = filtros.dataFim
      ? new Date(filtros.dataFim.getTime() + 24 * 60 * 60 * 1000)
      : undefined;
    const range: Prisma.DateTimeFilter = {};
    if (filtros.dataInicio) range.gte = filtros.dataInicio;
    if (fimExclusivo) range.lt = fimExclusivo;

    periodoWhere = {
      OR: [{ dataVencimento: range }, { status: "pago", dataPagamento: range }],
    };
  }

  const where: Prisma.PagamentoWhereInput = {
    status: filtros.status,
    contratoId: filtros.contratoId,
    competencia: filtros.competencia,
    contrato: contratoClausulas.length > 0 ? { AND: contratoClausulas } : undefined,
    AND: periodoWhere,
  };

  // "valor" ordena pelo valor previsto (o valor pago so existe apos a
  // quitacao, e o previsto e o que da a ordenacao mais estavel/comparavel).
  const campoOrdenacao = filtros.ordenarPor === "valor" ? "valorPrevisto" : "dataVencimento";
  const ordem = filtros.ordem ?? "asc";

  const [dados, total] = await Promise.all([
    prisma.pagamento.findMany({
      where,
      include: includePadrao,
      orderBy: { [campoOrdenacao]: ordem },
      skip: paginacao.skip,
      take: paginacao.take,
    }),
    prisma.pagamento.count({ where }),
  ]);

  return paginar(dados, total, paginacao);
}

export async function buscarPorIdOuFalhar(id: string) {
  await atualizarAtrasados();
  const pagamento = await prisma.pagamento.findUnique({ where: { id }, include: includePadrao });
  if (!pagamento) throw new AppError("Pagamento nao encontrado", 404);
  return pagamento;
}

export async function criarAvulso(data: z.infer<typeof criarPagamentoAvulsoSchema>) {
  const contrato = await prisma.contrato.findUnique({ where: { id: data.contratoId } });
  if (!contrato) throw new AppError("Contrato nao encontrado", 400);

  return prisma.pagamento.create({
    data: { ...data, status: "pendente" },
    include: includePadrao,
  });
}

export async function atualizar(id: string, data: z.infer<typeof atualizarPagamentoSchema>) {
  const pagamento = await buscarPorIdOuFalhar(id);
  if (pagamento.status === "pago") {
    throw new AppError("Nao e possivel editar um pagamento ja quitado", 409);
  }
  if (pagamento.status === "cancelado") {
    throw new AppError("Nao e possivel editar um pagamento cancelado (contrato encerrado/renovado)", 409);
  }
  return prisma.pagamento.update({ where: { id }, data, include: includePadrao });
}

export async function marcarComoPago(id: string, data: z.infer<typeof marcarPagoSchema>, usuarioId: string) {
  const pagamento = await buscarPorIdOuFalhar(id);
  if (pagamento.status === "pago") {
    throw new AppError("Este pagamento ja esta marcado como pago", 409);
  }
  if (pagamento.status === "cancelado") {
    throw new AppError("Nao e possivel pagar um pagamento cancelado (contrato encerrado/renovado)", 409);
  }

  const dataPagamento = data.dataPagamento ?? new Date();

  const atualizado = await prisma.pagamento.update({
    where: { id },
    data: {
      status: "pago",
      valorPago: data.valorPago,
      dataPagamento,
      formaPagamento: data.formaPagamento,
      observacoes: data.observacoes ?? pagamento.observacoes,
    },
    include: includePadrao,
  });

  await gerarEAnexarRecibo(atualizado, dataPagamento, usuarioId);

  return prisma.pagamento.findUniqueOrThrow({ where: { id }, include: includePadrao });
}

// Gera o PDF do recibo e cria o registro ReciboPdf vinculado ao pagamento.
// Falha silenciosamente (loga, nao interrompe o fluxo) se a geracao do PDF
// der erro: o pagamento ja foi registrado, o recibo pode ser tentado depois.
// A assinatura do recibo usa o nome do proprietario (identidade do negocio),
// mas geradoPorId registra quem de fato executou a acao (proprietario ou administrador).
async function gerarEAnexarRecibo(
  pagamento: Prisma.PagamentoGetPayload<{ include: typeof includePadrao }>,
  dataPagamento: Date,
  usuarioId: string,
) {
  try {
    const proprietario = await prisma.usuario.findFirst({ where: { role: "proprietario" } });
    if (!proprietario) return;

    const arquivo = await gerarReciboPdf({
      tipo: pagamento.tipo,
      competencia: pagamento.competencia,
      valorPago: pagamento.valorPago ?? pagamento.valorPrevisto,
      dataPagamento,
      formaPagamento: pagamento.formaPagamento ?? "outro",
      imovel: pagamento.contrato.imovel,
      inquilino: {
        nome: pagamento.contrato.inquilino.usuario.nome,
        cpf: pagamento.contrato.inquilino.cpf,
      },
      proprietario: { nome: proprietario.nome },
    });

    await prisma.reciboPdf.create({
      data: {
        pagamentoId: pagamento.id,
        tipo: "recibo_pagamento",
        caminhoArquivo: arquivo.url,
        geradoPorId: usuarioId,
      },
    });
  } catch (err) {
    console.error("Falha ao gerar recibo em PDF:", err);
  }
}

// Reverte um "marcar como pago" feito por engano. O status volta para
// "pendente" mesmo se o vencimento ja passou - a proxima leitura (via
// atualizarAtrasados, que roda no topo de listar/buscarPorIdOuFalhar) ja
// promove automaticamente para "atrasado" quando for o caso, entao nao ha
// necessidade de recalcular isso aqui.
export async function desfazerPagamento(id: string, data: z.infer<typeof desfazerPagamentoSchema>) {
  const pagamento = await buscarPorIdOuFalhar(id);
  if (pagamento.status !== "pago") {
    throw new AppError("Este pagamento nao esta marcado como pago", 409);
  }

  if (data.removerRecibo && pagamento.recibo) {
    await removerArquivo(pagamento.recibo.caminhoArquivo);
    await prisma.reciboPdf.delete({ where: { id: pagamento.recibo.id } });
  }

  return prisma.pagamento.update({
    where: { id },
    data: { status: "pendente", valorPago: null, dataPagamento: null, formaPagamento: null },
    include: includePadrao,
  });
}

export async function anexarComprovante(id: string, url: string, nomeOriginal: string, tamanho: number) {
  const antes = await buscarPorIdOuFalhar(id);
  await removerArquivo(antes.comprovanteUrl);
  return prisma.pagamento.update({
    where: { id },
    data: {
      comprovanteUrl: url,
      comprovanteNomeOriginal: nomeOriginal,
      comprovanteTamanho: tamanho,
      comprovanteUploadEm: new Date(),
    },
    include: includePadrao,
  });
}

export async function removerComprovante(id: string) {
  const antes = await buscarPorIdOuFalhar(id);
  await removerArquivo(antes.comprovanteUrl);
  return prisma.pagamento.update({
    where: { id },
    data: {
      comprovanteUrl: null,
      comprovanteNomeOriginal: null,
      comprovanteTamanho: null,
      comprovanteUploadEm: null,
    },
    include: includePadrao,
  });
}
