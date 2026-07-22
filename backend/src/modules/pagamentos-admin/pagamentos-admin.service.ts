import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import type {
  criarPagamentoAdminSchema,
  atualizarPagamentoAdminSchema,
  marcarPagoAdminSchema,
} from "./pagamentos-admin.schema";
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

async function atualizarAtrasados() {
  await prisma.pagamentoAdministrador.updateMany({
    where: { status: "pendente", dataVencimento: { lt: new Date() } },
    data: { status: "atrasado" },
  });
}

export async function listar(filtros: FiltrosPagamentoAdmin) {
  await atualizarAtrasados();
  const paginacao = parsePaginacao(filtros);

  const where: Prisma.PagamentoAdministradorWhereInput = { administradorId: filtros.administradorId };

  const [dados, total] = await Promise.all([
    prisma.pagamentoAdministrador.findMany({
      where,
      include: includePadrao,
      orderBy: { dataVencimento: "desc" },
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
  if (!pagamento) throw new AppError("Pagamento de administrador nao encontrado", 404);
  return pagamento;
}

export async function criar(data: z.infer<typeof criarPagamentoAdminSchema>) {
  const administrador = await prisma.usuario.findUnique({ where: { id: data.administradorId } });
  if (!administrador || administrador.role !== "administrador") {
    throw new AppError("Administrador nao encontrado", 400);
  }

  return prisma.pagamentoAdministrador.create({
    data: { ...data, status: "pendente" },
    include: includePadrao,
  });
}

export async function atualizar(id: string, data: z.infer<typeof atualizarPagamentoAdminSchema>) {
  const pagamento = await buscarPorIdOuFalhar(id);
  if (pagamento.status === "pago") {
    throw new AppError("Nao e possivel editar uma mensalidade ja paga", 409);
  }
  return prisma.pagamentoAdministrador.update({ where: { id }, data, include: includePadrao });
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
