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
  apenasExcluidos?: boolean;
  // null = sem restricao (proprietario); array = ids permitidos (administrador vinculado)
  imovelIdsPermitidos?: string[] | null;
}

export async function listar(filtros: FiltrosImovel) {
  const paginacao = parsePaginacao(filtros);

  const where: Prisma.ImovelWhereInput = {
    id: filtros.imovelIdsPermitidos ? { in: filtros.imovelIdsPermitidos } : undefined,
    status: filtros.status,
    tipoImovelId: filtros.tipoImovelId,
    excluidoEm: filtros.apenasExcluidos ? { not: null } : null,
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
      // excluidoEm: null - mesmo filtro de soft delete que o menu de
      // Manutencoes aplica por padrao (ver manutencao.service.ts:listar).
      // Sem isso, gastos ja excluidos aparecem no historico do imovel.
      gastosManutencao: { where: { excluidoEm: null }, orderBy: { createdAt: "desc" } },
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
  const imovel = await buscarPorIdOuFalhar(id);
  if (imovel.excluidoEm) throw new AppError("Este imovel ja esta excluido", 409);
  if (imovel.status === "alugado") {
    throw new AppError("Nao e possivel excluir um imovel com contrato ativo. Encerre o contrato primeiro.", 409);
  }
  await prisma.imovel.update({ where: { id }, data: { excluidoEm: new Date() } });
}

export async function restaurar(id: string) {
  const imovel = await buscarPorIdOuFalhar(id);
  if (!imovel.excluidoEm) throw new AppError("Este imovel nao esta excluido", 409);
  await prisma.imovel.update({ where: { id }, data: { excluidoEm: null } });
}

export async function ativar(id: string) {
  const imovel = await buscarPorIdOuFalhar(id);
  if (imovel.excluidoEm) throw new AppError("Nao e possivel ativar um imovel excluido", 409);
  if (imovel.status !== "inativo") throw new AppError("Somente imoveis inativos podem ser ativados", 409);
  return prisma.imovel.update({ where: { id }, data: { status: "vago" } });
}

export async function desativar(id: string) {
  const imovel = await buscarPorIdOuFalhar(id);
  if (imovel.excluidoEm) throw new AppError("Nao e possivel desativar um imovel excluido", 409);
  if (imovel.status === "alugado") {
    throw new AppError("Nao e possivel desativar um imovel com contrato ativo. Encerre o contrato primeiro.", 409);
  }
  if (imovel.status === "inativo") throw new AppError("Este imovel ja esta inativo", 409);
  return prisma.imovel.update({ where: { id }, data: { status: "inativo" } });
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
