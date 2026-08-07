import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { removerArquivo } from "../../lib/storage";
import { atualizarValores } from "../contratos/contratos.service";
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
    orderBy: { dataAditivo: "desc" },
  });
}

export async function buscarPorIdOuFalhar(id: string) {
  const aditivo = await prisma.aditivoContrato.findUnique({ where: { id }, include: includePadrao });
  if (!aditivo) throw new AppError("Aditivo nao encontrado", 404);
  return aditivo;
}

// aplicarNoContrato=true (padrao - botao "Adicionar Aditivo" na aba Aditivos
// do contrato): le os valores atuais do CONTRATO (mesmo registro, nunca cria
// um novo) como "anterior" e aplica de verdade os novos, reaproveitando
// atualizarValores() de contratos.service.ts (clamp de dia, propagacao para
// Pagamento pendente/atrasado). aplicarNoContrato=false (usado so pelo fluxo
// de renovacao - ver ContratosPage.tsx): o valor novo ja foi aplicado pelo
// proprio renovar() no contrato recem-criado, entao aqui e so registro
// historico com anterior/novo informados manualmente pelo cliente.
export async function criar(
  contratoId: string,
  data: z.infer<typeof criarAditivoSchema>,
  arquivoUrl: string | undefined,
  criadoPorId: string,
) {
  const contrato = await prisma.contrato.findUnique({ where: { id: contratoId } });
  if (!contrato) throw new AppError("Contrato nao encontrado", 404);

  let valorAluguelAnterior = data.valorAluguelAnterior ?? null;
  let diaVencimentoAnterior = data.diaVencimentoAnterior ?? null;
  let dataFimAnterior = data.dataFimAnterior ?? null;

  if (data.aplicarNoContrato) {
    if (contrato.status !== "ativo" && contrato.status !== "encerrado") {
      throw new AppError("Somente contratos ativos ou encerrados podem receber aditivo", 409);
    }

    valorAluguelAnterior = data.valorAluguelNovo !== undefined ? contrato.valorAluguel : null;
    diaVencimentoAnterior = data.diaVencimentoNovo !== undefined ? contrato.diaVencimento : null;
    dataFimAnterior = data.dataFimNova !== undefined ? contrato.dataFim : null;

    if (data.valorAluguelNovo !== undefined || data.diaVencimentoNovo !== undefined) {
      await atualizarValores(contratoId, {
        valorAluguel: data.valorAluguelNovo,
        diaVencimento: data.diaVencimentoNovo,
        atualizarPagamentosFuturos: data.atualizarPagamentosFuturos ?? false,
        atualizarDataVencimentoPendentes: data.atualizarDataVencimentoPendentes ?? true,
      });
    }
    if (data.dataFimNova !== undefined) {
      await prisma.contrato.update({ where: { id: contratoId }, data: { dataFim: data.dataFimNova } });
    }
  }

  return prisma.aditivoContrato.create({
    data: {
      contratoId,
      descricaoAlteracoes: data.descricaoAlteracoes,
      dataAditivo: data.dataAditivo ?? new Date(),
      arquivoPdfUrl: arquivoUrl,
      valorAluguelAnterior,
      valorAluguelNovo: data.valorAluguelNovo ?? null,
      diaVencimentoAnterior,
      diaVencimentoNovo: data.diaVencimentoNovo ?? null,
      dataFimAnterior,
      dataFimNovo: data.dataFimNova ?? null,
      criadoPorId,
    },
    include: includePadrao,
  });
}

// So remove o registro historico - nao reverte as mudancas ja aplicadas no
// Contrato (aditivo e um log de auditoria, nao uma transacao reversivel;
// "desfazer" de verdade seria outro aditivo registrando a reversao).
export async function excluir(id: string) {
  const aditivo = await buscarPorIdOuFalhar(id);
  if (aditivo.arquivoPdfUrl) await removerArquivo(aditivo.arquivoPdfUrl);
  await prisma.aditivoContrato.delete({ where: { id } });
}
