import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { removerArquivoFisico } from "../../middlewares/upload.middleware";
import type { criarAditivoSchema } from "./aditivos.schema";
import type { z } from "zod";

const includePadrao = {
  contrato: { select: { id: true, imovelId: true } },
  criadoPor: { select: { nome: true, email: true } },
} as const;

export async function listarPorContrato(contratoId: string) {
  return prisma.aditivoContrato.findMany({
    where: { contratoId },
    include: includePadrao,
    orderBy: { createdAt: "desc" },
  });
}

export async function buscarPorIdOuFalhar(id: string) {
  const aditivo = await prisma.aditivoContrato.findUnique({ where: { id }, include: includePadrao });
  if (!aditivo) throw new AppError("Aditivo nao encontrado", 404);
  return aditivo;
}

export async function criar(
  contratoId: string,
  data: z.infer<typeof criarAditivoSchema>,
  arquivoUrl: string,
  criadoPorId: string,
) {
  const contrato = await prisma.contrato.findUnique({ where: { id: contratoId } });
  if (!contrato) throw new AppError("Contrato nao encontrado", 404);

  return prisma.aditivoContrato.create({
    data: {
      contratoId,
      contratoAnteriorId: data.contratoAnteriorId,
      descricaoAlteracoes: data.descricaoAlteracoes,
      valorAnterior: data.valorAnterior,
      valorNovo: data.valorNovo,
      arquivoPdfUrl: arquivoUrl,
      criadoPorId,
    },
    include: includePadrao,
  });
}

export async function excluir(id: string) {
  const aditivo = await buscarPorIdOuFalhar(id);
  removerArquivoFisico(aditivo.arquivoPdfUrl);
  await prisma.aditivoContrato.delete({ where: { id } });
}
