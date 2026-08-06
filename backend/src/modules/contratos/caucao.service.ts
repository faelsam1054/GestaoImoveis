import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { gerarReciboPdf } from "../../services/pdf/recibo.pdf";
import type { pagarParcelaCaucaoSchema, atualizarParcelasCaucaoSchema } from "./caucao.schema";
import type { CaucaoParcela } from "@prisma/client";
import type { z } from "zod";

// Bidirecional, mesmo motivo de pagamentos.service.ts:atualizarAtrasados -
// tambem reverte atrasado->pendente se o vencimento da parcela for adiado.
async function atualizarAtrasadas() {
  await Promise.all([
    prisma.caucaoParcela.updateMany({
      where: { status: "pendente", dataVencimento: { lt: new Date() } },
      data: { status: "atrasado" },
    }),
    prisma.caucaoParcela.updateMany({
      where: { status: "atrasado", dataVencimento: { gte: new Date() } },
      data: { status: "pendente" },
    }),
  ]);
}

export async function listarParcelas(contratoId: string) {
  await atualizarAtrasadas();
  return prisma.caucaoParcela.findMany({ where: { contratoId }, orderBy: { numeroParcela: "asc" } });
}

async function buscarParcelaOuFalhar(contratoId: string, parcelaId: string) {
  const parcela = await prisma.caucaoParcela.findUnique({ where: { id: parcelaId } });
  if (!parcela || parcela.contratoId !== contratoId) throw new AppError("Parcela de caucao nao encontrada", 404);
  return parcela;
}

async function gerarEAnexarReciboParcela(contratoId: string, parcela: CaucaoParcela, dataPagamento: Date) {
  try {
    const contrato = await prisma.contrato.findUniqueOrThrow({
      where: { id: contratoId },
      include: { imovel: true, inquilino: { include: { usuario: true } } },
    });
    const proprietario = await prisma.usuario.findFirst({ where: { role: "proprietario" } });
    if (!proprietario) return;

    const totalParcelas = await prisma.caucaoParcela.count({ where: { contratoId } });
    const competencia = `${parcela.dataVencimento.getFullYear()}-${String(parcela.dataVencimento.getMonth() + 1).padStart(2, "0")}`;

    const arquivo = await gerarReciboPdf({
      tipo: "caucao",
      competencia,
      valorPago: parcela.valorParcela,
      dataPagamento,
      formaPagamento: parcela.formaPagamento ?? "outro",
      imovel: contrato.imovel,
      inquilino: { nome: contrato.inquilino.usuario.nome, cpf: contrato.inquilino.cpf },
      proprietario: { nome: proprietario.nome },
      detalheExtra: `(parcela ${parcela.numeroParcela} de ${totalParcelas})`,
    });

    await prisma.caucaoParcela.update({ where: { id: parcela.id }, data: { reciboPdfUrl: arquivo.url } });
  } catch (err) {
    console.error("Falha ao gerar recibo da parcela de caucao:", err);
  }
}

export async function pagarParcela(
  contratoId: string,
  parcelaId: string,
  data: z.infer<typeof pagarParcelaCaucaoSchema>,
) {
  const parcela = await buscarParcelaOuFalhar(contratoId, parcelaId);
  if (parcela.status === "pago") {
    throw new AppError("Esta parcela ja esta marcada como paga", 409);
  }

  const dataPagamento = data.dataPagamento ?? new Date();

  const atualizada = await prisma.caucaoParcela.update({
    where: { id: parcelaId },
    data: {
      status: "pago",
      dataPagamento,
      formaPagamento: data.formaPagamento,
      observacoes: data.observacoes ?? parcela.observacoes,
    },
  });

  await gerarEAnexarReciboParcela(contratoId, atualizada, dataPagamento);

  return prisma.caucaoParcela.findUniqueOrThrow({ where: { id: parcelaId } });
}

// Edita valores/vencimentos das parcelas pendentes (ou cria novas). Parcelas
// ja pagas sao protegidas: so passam se vierem identicas na lista, e nunca
// podem ser removidas silenciosamente.
export async function atualizarParcelas(contratoId: string, data: z.infer<typeof atualizarParcelasCaucaoSchema>) {
  const existentes = await prisma.caucaoParcela.findMany({ where: { contratoId } });
  const existentesPorId = new Map(existentes.map((p) => [p.id, p]));
  const idsRecebidos = new Set(data.parcelas.filter((p) => p.id).map((p) => p.id));

  for (const existente of existentes) {
    if (existente.status === "pago" && !idsRecebidos.has(existente.id)) {
      throw new AppError(`A parcela ${existente.numeroParcela} ja foi paga e nao pode ser removida`, 409);
    }
  }

  return prisma.$transaction(async (tx) => {
    for (const parcela of data.parcelas) {
      const existente = parcela.id ? existentesPorId.get(parcela.id) : undefined;

      if (existente) {
        if (existente.status === "pago") {
          const inalterada =
            existente.valorParcela === parcela.valorParcela &&
            existente.dataVencimento.getTime() === new Date(parcela.dataVencimento).getTime();
          if (!inalterada) {
            throw new AppError(
              `Nao e possivel alterar valor/vencimento da parcela ${parcela.numeroParcela}, ja paga`,
              409,
            );
          }
          continue;
        }
        await tx.caucaoParcela.update({
          where: { id: existente.id },
          data: {
            numeroParcela: parcela.numeroParcela,
            valorParcela: parcela.valorParcela,
            dataVencimento: parcela.dataVencimento,
            observacoes: parcela.observacoes,
          },
        });
      } else {
        await tx.caucaoParcela.create({
          data: {
            contratoId,
            numeroParcela: parcela.numeroParcela,
            valorParcela: parcela.valorParcela,
            dataVencimento: parcela.dataVencimento,
            observacoes: parcela.observacoes,
            status: "pendente",
          },
        });
      }
    }

    const idsFinais = data.parcelas.filter((p): p is typeof p & { id: string } => Boolean(p.id)).map((p) => p.id);
    await tx.caucaoParcela.deleteMany({
      where: { contratoId, status: "pendente", id: { notIn: idsFinais } },
    });

    return tx.caucaoParcela.findMany({ where: { contratoId }, orderBy: { numeroParcela: "asc" } });
  });
}

export async function removerParcela(contratoId: string, parcelaId: string) {
  const parcela = await buscarParcelaOuFalhar(contratoId, parcelaId);
  if (parcela.status !== "pendente") {
    throw new AppError("Somente parcelas pendentes podem ser removidas", 409);
  }
  await prisma.caucaoParcela.delete({ where: { id: parcelaId } });
}
