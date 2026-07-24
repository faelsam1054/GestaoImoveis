import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import { removerArquivo } from "../../lib/storage";
import { ORDEM_STATUS_MANUTENCAO, MESES_POR_RECORRENCIA, type StatusManutencao } from "../../constants/dominio";
import { combinarFiltroImovel } from "../administradores/acesso-imovel.service";
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
  imovelIdsPermitidos?: string[] | null;
  apenasExcluidos?: boolean;
}

// Geracao preguicosa das proximas instancias de manutencoes recorrentes,
// disparada a cada listagem (nao ha cron/job agendado nesse projeto). So
// origens (manutencaoOrigemId null, recorrencia != "unica", ativo=true, nao
// excluidas) sao consideradas; cada instancia gerada aponta de volta pra
// origem e nasce como "unica" (nao gera sua propria cadeia de recorrencia).
async function gerarProximasRecorrencias() {
  const origens = await prisma.gastoManutencao.findMany({
    where: { manutencaoOrigemId: null, recorrencia: { not: "unica" }, ativo: true, excluidoEm: null },
  });

  const limiteGeracao = new Date();
  limiteGeracao.setMonth(limiteGeracao.getMonth() + 3);

  for (const origem of origens) {
    const incrementoMeses = MESES_POR_RECORRENCIA[origem.recorrencia as keyof typeof MESES_POR_RECORRENCIA] ?? 1;

    const ultimaGerada = await prisma.gastoManutencao.findFirst({
      where: { manutencaoOrigemId: origem.id },
      orderBy: { dataExecucao: "desc" },
    });

    const dataBase = ultimaGerada?.dataExecucao ?? origem.dataExecucao ?? origem.createdAt;
    const proximaData = new Date(dataBase);
    proximaData.setMonth(proximaData.getMonth() + incrementoMeses);

    while (proximaData <= limiteGeracao) {
      if (origem.dataFimRecorrencia && proximaData > origem.dataFimRecorrencia) break;

      await prisma.gastoManutencao.create({
        data: {
          imovelId: origem.imovelId,
          descricao: origem.descricao,
          categoria: origem.categoria,
          valor: origem.valor,
          dataExecucao: new Date(proximaData),
          prestadorNome: origem.prestadorNome,
          prestadorDocumento: origem.prestadorDocumento,
          prestadorTelefone: origem.prestadorTelefone,
          observacoes: origem.observacoes,
          origem: origem.origem,
          status: "orcamento",
          recorrencia: "unica",
          manutencaoOrigemId: origem.id,
        },
      });

      proximaData.setMonth(proximaData.getMonth() + incrementoMeses);
    }
  }
}

export async function listar(filtros: FiltrosManutencao) {
  await gerarProximasRecorrencias();
  const paginacao = parsePaginacao(filtros);

  const where: Prisma.GastoManutencaoWhereInput = {
    imovelId: combinarFiltroImovel(filtros.imovelId, filtros.imovelIdsPermitidos ?? null),
    status: filtros.status,
    categoria: filtros.categoria,
    excluidoEm: filtros.apenasExcluidos ? { not: null } : null,
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

// Edicao completa, para corrigir erros de cadastro - por isso, ao contrario
// de atualizarStatus(), NAO impede retroceder o status (ex: desfazer um
// "pago" registrado por engano) nem bloqueia editar um gasto ja pago.
export async function atualizar(id: string, data: z.infer<typeof atualizarGastoManutencaoSchema>) {
  const antes = await buscarPorIdOuFalhar(id);

  if (data.imovelId && data.imovelId !== antes.imovelId) {
    const novoImovel = await prisma.imovel.findUnique({ where: { id: data.imovelId } });
    if (!novoImovel) throw new AppError("Imovel nao encontrado", 400);
  }

  const novoStatus = data.status ?? antes.status;
  const dataExecucaoEfetiva = data.dataExecucao !== undefined ? data.dataExecucao : antes.dataExecucao;
  let dataPagamentoEfetiva = data.dataPagamento !== undefined ? data.dataPagamento : antes.dataPagamento;
  let formaPagamentoEfetiva = data.formaPagamento !== undefined ? data.formaPagamento : antes.formaPagamento;

  if (novoStatus === "pago") {
    if (!dataPagamentoEfetiva || !formaPagamentoEfetiva) {
      throw new AppError("Para marcar como pago, informe data de pagamento e forma de pagamento", 400);
    }
  } else if (antes.status === "pago" && novoStatus !== "pago") {
    // Saindo de "pago": limpa os dados de pagamento. A confirmacao dessa
    // acao (perguntar ao usuario se tem certeza) e responsabilidade do
    // frontend, antes de enviar a requisicao.
    dataPagamentoEfetiva = null;
    formaPagamentoEfetiva = null;
  }

  if (dataPagamentoEfetiva && dataExecucaoEfetiva && dataPagamentoEfetiva < dataExecucaoEfetiva) {
    throw new AppError("A data de pagamento não pode ser anterior à data de execução", 400);
  }

  return prisma.gastoManutencao.update({
    where: { id },
    data: { ...data, dataPagamento: dataPagamentoEfetiva, formaPagamento: formaPagamentoEfetiva },
    include: { imovel: true },
  });
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

export async function anexarComprovante(id: string, url: string, nomeOriginal: string, tamanho: number) {
  const antes = await buscarPorIdOuFalhar(id);
  await removerArquivo(antes.comprovantePdfUrl);
  return prisma.gastoManutencao.update({
    where: { id },
    data: {
      comprovantePdfUrl: url,
      comprovanteNomeOriginal: nomeOriginal,
      comprovanteTamanho: tamanho,
      comprovanteUploadEm: new Date(),
    },
    include: { imovel: true },
  });
}

export async function removerComprovante(id: string) {
  const antes = await buscarPorIdOuFalhar(id);
  await removerArquivo(antes.comprovantePdfUrl);
  return prisma.gastoManutencao.update({
    where: { id },
    data: {
      comprovantePdfUrl: null,
      comprovanteNomeOriginal: null,
      comprovanteTamanho: null,
      comprovanteUploadEm: null,
    },
    include: { imovel: true },
  });
}

// Soft delete (mesmo padrao do Inquilino): preserva o registro financeiro,
// so oculta da listagem padrao. O arquivo de comprovante, porem, e removido
// do Storage de verdade - nao ha motivo pra manter o PDF orfao.
export async function excluir(id: string) {
  const gasto = await buscarPorIdOuFalhar(id);
  if (gasto.excluidoEm) throw new AppError("Este gasto de manutencao ja esta excluido", 409);

  await removerArquivo(gasto.comprovantePdfUrl);
  await prisma.gastoManutencao.update({ where: { id }, data: { excluidoEm: new Date() } });
}

function garantirEhOrigemRecorrente(gasto: { recorrencia: string; manutencaoOrigemId: string | null }) {
  if (gasto.recorrencia === "unica" || gasto.manutencaoOrigemId) {
    throw new AppError("Esta manutencao nao e uma recorrencia original", 400);
  }
}

export async function pausarRecorrencia(id: string) {
  const gasto = await buscarPorIdOuFalhar(id);
  garantirEhOrigemRecorrente(gasto);
  return prisma.gastoManutencao.update({ where: { id }, data: { ativo: false }, include: { imovel: true } });
}

export async function retomarRecorrencia(id: string) {
  const gasto = await buscarPorIdOuFalhar(id);
  garantirEhOrigemRecorrente(gasto);
  return prisma.gastoManutencao.update({ where: { id }, data: { ativo: true }, include: { imovel: true } });
}

export async function listarRecorrencias(id: string) {
  await buscarPorIdOuFalhar(id);
  return prisma.gastoManutencao.findMany({
    where: { manutencaoOrigemId: id },
    orderBy: { dataExecucao: "asc" },
  });
}
