import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import { ORDEM_STATUS_MANUTENCAO, type StatusManutencao } from "../../constants/dominio";
import type {
  criarGastoManutencaoSchema,
  atualizarGastoManutencaoSchema,
  atualizarStatusManutencaoSchema,
} from "./manutencao.schema";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";

interface FiltrosManutencao {
  imovelId?: string;
  status?: string;
  categoria?: string;
  page?: string;
  pageSize?: string;
}

export async function listar(filtros: FiltrosManutencao) {
  const paginacao = parsePaginacao(filtros);

  const where: Prisma.GastoManutencaoWhereInput = {
    imovelId: filtros.imovelId,
    status: filtros.status,
    categoria: filtros.categoria,
  };

  const [dados, total] = await Promise.all([
    prisma.gastoManutencao.findMany({
      where,
      include: { imovel: { select: { id: true, logradouro: true, numero: true, bairro: true } } },
      orderBy: { createdAt: "desc" },
      skip: paginacao.skip,
      take: paginacao.take,
    }),
    prisma.gastoManutencao.count({ where }),
  ]);

  return paginar(dados, total, paginacao);
}

export async function buscarPorIdOuFalhar(id: string) {
  const gasto = await prisma.gastoManutencao.findUnique({
    where: { id },
    include: { imovel: true },
  });
  if (!gasto) throw new AppError("Gasto de manutencao nao encontrado", 404);
  return gasto;
}

export async function criar(data: z.infer<typeof criarGastoManutencaoSchema>, origem: "proprietario" | "chamado_inquilino" = "proprietario") {
  const imovel = await prisma.imovel.findUnique({ where: { id: data.imovelId } });
  if (!imovel) throw new AppError("Imovel nao encontrado", 400);

  return prisma.gastoManutencao.create({
    data: { ...data, origem, status: "orcamento" },
    include: { imovel: true },
  });
}

export async function atualizar(id: string, data: z.infer<typeof atualizarGastoManutencaoSchema>) {
  const gasto = await buscarPorIdOuFalhar(id);
  if (gasto.status === "pago") {
    throw new AppError("Nao e possivel editar um gasto de manutencao ja pago", 409);
  }
  return prisma.gastoManutencao.update({ where: { id }, data, include: { imovel: true } });
}

export async function atualizarStatus(id: string, data: z.infer<typeof atualizarStatusManutencaoSchema>) {
  const gasto = await buscarPorIdOuFalhar(id);
  const atual = gasto.status as StatusManutencao;

  if (ORDEM_STATUS_MANUTENCAO[data.status] < ORDEM_STATUS_MANUTENCAO[atual]) {
    throw new AppError(`Nao e possivel retroceder o status de "${atual}" para "${data.status}"`, 409);
  }

  return prisma.gastoManutencao.update({
    where: { id },
    data: {
      status: data.status,
      dataPagamento: data.status === "pago" ? (data.dataPagamento ?? new Date()) : gasto.dataPagamento,
    },
    include: { imovel: true },
  });
}

export async function anexarComprovante(id: string, url: string) {
  await buscarPorIdOuFalhar(id);
  return prisma.gastoManutencao.update({ where: { id }, data: { comprovantePdfUrl: url } });
}
