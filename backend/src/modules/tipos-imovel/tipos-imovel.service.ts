import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { criarTipoImovelSchema, atualizarTipoImovelSchema } from "./tipos-imovel.schema";
import type { z } from "zod";

export async function listar(ativo?: boolean) {
  return prisma.tipoImovel.findMany({
    where: ativo === undefined ? undefined : { ativo },
    orderBy: { nome: "asc" },
  });
}

export async function buscarPorIdOuFalhar(id: string) {
  const tipo = await prisma.tipoImovel.findUnique({ where: { id } });
  if (!tipo) throw new AppError("Tipo de imovel nao encontrado", 404);
  return tipo;
}

export async function criar(data: z.infer<typeof criarTipoImovelSchema>) {
  return prisma.tipoImovel.create({ data });
}

export async function atualizar(id: string, data: z.infer<typeof atualizarTipoImovelSchema>) {
  await buscarPorIdOuFalhar(id);
  return prisma.tipoImovel.update({ where: { id }, data });
}

export async function desativar(id: string) {
  await buscarPorIdOuFalhar(id);
  return prisma.tipoImovel.update({ where: { id }, data: { ativo: false } });
}

export async function reativar(id: string) {
  await buscarPorIdOuFalhar(id);
  return prisma.tipoImovel.update({ where: { id }, data: { ativo: true } });
}
