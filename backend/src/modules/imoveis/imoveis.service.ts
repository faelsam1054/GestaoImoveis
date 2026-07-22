import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import type { criarImovelSchema, atualizarImovelSchema } from "./imoveis.schema";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";

interface FiltrosImovel {
  status?: string;
  tipoImovelId?: string;
  busca?: string;
  page?: string;
  pageSize?: string;
}

export async function listar(filtros: FiltrosImovel) {
  const paginacao = parsePaginacao(filtros);

  const where: Prisma.ImovelWhereInput = {
    status: filtros.status,
    tipoImovelId: filtros.tipoImovelId,
    ...(filtros.busca
      ? {
          OR: [
            { logradouro: { contains: filtros.busca } },
            { bairro: { contains: filtros.busca } },
            { cidade: { contains: filtros.busca } },
          ],
        }
      : {}),
  };

  const [dados, total] = await Promise.all([
    prisma.imovel.findMany({
      where,
      include: { tipoImovel: true, fotos: true },
      orderBy: { createdAt: "desc" },
      skip: paginacao.skip,
      take: paginacao.take,
    }),
    prisma.imovel.count({ where }),
  ]);

  return paginar(dados, total, paginacao);
}

export async function buscarPorIdOuFalhar(id: string) {
  const imovel = await prisma.imovel.findUnique({
    where: { id },
    include: {
      tipoImovel: true,
      fotos: true,
      contratos: {
        orderBy: { createdAt: "desc" },
        include: {
          inquilino: { include: { usuario: { select: { nome: true, email: true } } } },
          pagamentos: { orderBy: { dataVencimento: "desc" } },
        },
      },
      gastosManutencao: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!imovel) throw new AppError("Imovel nao encontrado", 404);
  return imovel;
}

export async function detalhar(id: string) {
  const imovel = await buscarPorIdOuFalhar(id);
  const gastoTotalManutencao = imovel.gastosManutencao
    .filter((g) => g.status === "pago")
    .reduce((total, g) => total + g.valor, 0);
  return { ...imovel, gastoTotalManutencao };
}

async function validarTipoImovel(tipoImovelId: string) {
  const tipo = await prisma.tipoImovel.findUnique({ where: { id: tipoImovelId } });
  if (!tipo) throw new AppError("Tipo de imovel nao encontrado", 400);
  if (!tipo.ativo) throw new AppError("Tipo de imovel esta desativado", 400);
}

export async function criar(data: z.infer<typeof criarImovelSchema>) {
  await validarTipoImovel(data.tipoImovelId);
  return prisma.imovel.create({ data });
}

export async function atualizar(id: string, data: z.infer<typeof atualizarImovelSchema>) {
  await buscarPorIdOuFalhar(id);
  if (data.tipoImovelId) await validarTipoImovel(data.tipoImovelId);
  return prisma.imovel.update({ where: { id }, data });
}

export async function remover(id: string) {
  const imovel = await prisma.imovel.findUnique({
    where: { id },
    include: { _count: { select: { contratos: true } } },
  });
  if (!imovel) throw new AppError("Imovel nao encontrado", 404);
  if (imovel._count.contratos > 0) {
    throw new AppError("Nao e possivel excluir um imovel que ja possui contratos vinculados", 409);
  }
  await prisma.imovel.delete({ where: { id } });
}

export async function adicionarFoto(imovelId: string, url: string) {
  await buscarPorIdOuFalhar(imovelId);
  return prisma.imovelFoto.create({ data: { imovelId, url } });
}

export async function removerFoto(imovelId: string, fotoId: string) {
  const foto = await prisma.imovelFoto.findUnique({ where: { id: fotoId } });
  if (!foto || foto.imovelId !== imovelId) throw new AppError("Foto nao encontrada", 404);
  await prisma.imovelFoto.delete({ where: { id: fotoId } });
}
