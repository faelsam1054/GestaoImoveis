import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import { gerarContratoPdf } from "../../services/pdf/contrato.pdf";
import type { criarContratoSchema, renovarContratoSchema } from "./contratos.schema";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";

interface FiltrosContrato {
  status?: string;
  imovelId?: string;
  inquilinoId?: string;
  page?: string;
  pageSize?: string;
}

const includePadrao = {
  imovel: { include: { tipoImovel: true } },
  inquilino: { include: { usuario: { select: { nome: true, email: true } } } },
} satisfies Prisma.ContratoInclude;

// Gera uma data de vencimento por mes entre dataInicio e dataFim (inclusive),
// usando o dia informado (limitado ao ultimo dia do mes quando necessario,
// ex: diaVencimento=30 em fevereiro cai no dia 28/29).
function gerarCompetencias(dataInicio: Date, dataFim: Date, diaVencimento: number) {
  const competencias: { competencia: string; dataVencimento: Date }[] = [];
  let cursor = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
  const fim = new Date(dataFim.getFullYear(), dataFim.getMonth(), 1);

  while (cursor <= fim) {
    const ano = cursor.getFullYear();
    const mes = cursor.getMonth();
    const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
    const dia = Math.min(diaVencimento, ultimoDiaDoMes);
    competencias.push({
      competencia: `${ano}-${String(mes + 1).padStart(2, "0")}`,
      dataVencimento: new Date(ano, mes, dia),
    });
    cursor = new Date(ano, mes + 1, 1);
  }

  return competencias;
}

async function gerarPagamentosDoContrato(
  tx: Prisma.TransactionClient,
  contratoId: string,
  dados: { dataInicio: Date; dataFim: Date; diaVencimento: number; valorAluguel: number; valorCaucao?: number },
) {
  if (dados.valorCaucao && dados.valorCaucao > 0) {
    await tx.pagamento.create({
      data: {
        contratoId,
        tipo: "caucao",
        competencia: `${dados.dataInicio.getFullYear()}-${String(dados.dataInicio.getMonth() + 1).padStart(2, "0")}`,
        valorPrevisto: dados.valorCaucao,
        dataVencimento: dados.dataInicio,
        status: "pendente",
      },
    });
  }

  const competencias = gerarCompetencias(dados.dataInicio, dados.dataFim, dados.diaVencimento);
  await tx.pagamento.createMany({
    data: competencias.map((c) => ({
      contratoId,
      tipo: "aluguel" as const,
      competencia: c.competencia,
      valorPrevisto: dados.valorAluguel,
      dataVencimento: c.dataVencimento,
      status: "pendente" as const,
    })),
  });
}

// Gera o PDF do contrato e grava a URL em Contrato.arquivoPdfUrl. Roda depois
// da transacao de criacao (evita I/O de arquivo dentro de uma transacao de banco)
// e falha silenciosamente: o contrato ja existe, o PDF pode ser gerado depois.
async function gerarEAnexarContratoPdf(contratoId: string) {
  try {
    const contrato = await prisma.contrato.findUniqueOrThrow({
      where: { id: contratoId },
      include: includePadrao,
    });
    const proprietario = await prisma.usuario.findFirst({ where: { role: "proprietario" } });
    if (!proprietario) return;

    const arquivo = await gerarContratoPdf({
      dataInicio: contrato.dataInicio,
      dataFim: contrato.dataFim,
      diaVencimento: contrato.diaVencimento,
      valorAluguel: contrato.valorAluguel,
      valorCaucao: contrato.valorCaucao,
      imovel: contrato.imovel,
      inquilino: {
        nome: contrato.inquilino.usuario.nome,
        cpf: contrato.inquilino.cpf,
        email: contrato.inquilino.usuario.email,
      },
      proprietario: { nome: proprietario.nome, email: proprietario.email },
    });

    await prisma.contrato.update({ where: { id: contratoId }, data: { arquivoPdfUrl: arquivo.url } });
  } catch (err) {
    console.error("Falha ao gerar PDF do contrato:", err);
  }
}

export async function listar(filtros: FiltrosContrato) {
  const paginacao = parsePaginacao(filtros);

  const where: Prisma.ContratoWhereInput = {
    status: filtros.status,
    imovelId: filtros.imovelId,
    inquilinoId: filtros.inquilinoId,
  };

  const [dados, total] = await Promise.all([
    prisma.contrato.findMany({
      where,
      include: includePadrao,
      orderBy: { createdAt: "desc" },
      skip: paginacao.skip,
      take: paginacao.take,
    }),
    prisma.contrato.count({ where }),
  ]);

  return paginar(dados, total, paginacao);
}

export async function buscarPorIdOuFalhar(id: string) {
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      ...includePadrao,
      pagamentos: { orderBy: { dataVencimento: "asc" } },
      contratoAnterior: true,
      contratoRenovado: true,
    },
  });
  if (!contrato) throw new AppError("Contrato nao encontrado", 404);
  return contrato;
}

export async function criar(data: z.infer<typeof criarContratoSchema>) {
  const imovel = await prisma.imovel.findUnique({ where: { id: data.imovelId } });
  if (!imovel) throw new AppError("Imovel nao encontrado", 400);
  if (imovel.status === "alugado") {
    throw new AppError("Este imovel ja possui um contrato ativo", 409);
  }

  const inquilino = await prisma.inquilino.findUnique({ where: { id: data.inquilinoId } });
  if (!inquilino) throw new AppError("Inquilino nao encontrado", 400);

  const contratoCriado = await prisma.$transaction(async (tx) => {
    const contrato = await tx.contrato.create({
      data: {
        imovelId: data.imovelId,
        inquilinoId: data.inquilinoId,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        diaVencimento: data.diaVencimento,
        valorAluguel: data.valorAluguel,
        valorCaucao: data.valorCaucao,
        status: "ativo",
      },
    });

    await gerarPagamentosDoContrato(tx, contrato.id, data);
    await tx.imovel.update({ where: { id: data.imovelId }, data: { status: "alugado" } });

    return tx.contrato.findUniqueOrThrow({ where: { id: contrato.id }, include: includePadrao });
  });

  await gerarEAnexarContratoPdf(contratoCriado.id);
  return prisma.contrato.findUniqueOrThrow({ where: { id: contratoCriado.id }, include: includePadrao });
}

async function liberarImovelSeSemContratoAtivo(tx: Prisma.TransactionClient, imovelId: string) {
  const aindaAtivo = await tx.contrato.findFirst({ where: { imovelId, status: "ativo" } });
  if (!aindaAtivo) {
    await tx.imovel.update({ where: { id: imovelId }, data: { status: "vago" } });
  }
}

export async function encerrar(id: string) {
  const contrato = await buscarPorIdOuFalhar(id);
  if (contrato.status !== "ativo") {
    throw new AppError("Somente contratos ativos podem ser encerrados", 409);
  }

  return prisma.$transaction(async (tx) => {
    const atualizado = await tx.contrato.update({ where: { id }, data: { status: "encerrado" } });
    await liberarImovelSeSemContratoAtivo(tx, contrato.imovelId);
    return atualizado;
  });
}

export async function rescindir(id: string) {
  const contrato = await buscarPorIdOuFalhar(id);
  if (contrato.status !== "ativo") {
    throw new AppError("Somente contratos ativos podem ser rescindidos", 409);
  }

  return prisma.$transaction(async (tx) => {
    const atualizado = await tx.contrato.update({ where: { id }, data: { status: "rescindido" } });
    await liberarImovelSeSemContratoAtivo(tx, contrato.imovelId);
    return atualizado;
  });
}

export async function renovar(id: string, data: z.infer<typeof renovarContratoSchema>) {
  const contratoAtual = await buscarPorIdOuFalhar(id);
  if (contratoAtual.status !== "ativo") {
    throw new AppError("Somente contratos ativos podem ser renovados", 409);
  }

  const novoContratoCriado = await prisma.$transaction(async (tx) => {
    await tx.contrato.update({ where: { id }, data: { status: "renovado" } });

    const novoContrato = await tx.contrato.create({
      data: {
        imovelId: contratoAtual.imovelId,
        inquilinoId: contratoAtual.inquilinoId,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        diaVencimento: data.diaVencimento,
        valorAluguel: data.valorAluguel,
        valorCaucao: data.valorCaucao,
        status: "ativo",
        contratoAnteriorId: id,
      },
    });

    await gerarPagamentosDoContrato(tx, novoContrato.id, data);
    await tx.imovel.update({ where: { id: contratoAtual.imovelId }, data: { status: "alugado" } });

    return tx.contrato.findUniqueOrThrow({ where: { id: novoContrato.id }, include: includePadrao });
  });

  await gerarEAnexarContratoPdf(novoContratoCriado.id);
  return prisma.contrato.findUniqueOrThrow({ where: { id: novoContratoCriado.id }, include: includePadrao });
}
