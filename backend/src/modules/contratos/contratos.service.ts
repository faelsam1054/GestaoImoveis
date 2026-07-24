import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import { gerarContratoPdf } from "../../services/pdf/contrato.pdf";
import { combinarFiltroImovel } from "../administradores/acesso-imovel.service";
import { enviarEmail } from "../email/email.service";
import type { criarContratoSchema, renovarContratoSchema } from "./contratos.schema";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { Role } from "../../types/rbac";

interface FiltrosContrato {
  status?: string;
  imovelId?: string;
  inquilinoId?: string;
  page?: string;
  pageSize?: string;
  imovelIdsPermitidos?: string[] | null;
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
  dados: {
    dataInicio: Date;
    dataFim: Date;
    diaVencimento: number;
    valorAluguel: number;
    valorCaucao?: number;
    caucaoNumeroParcelas?: number;
  },
) {
  // Caucao em parcela unica (padrao/legado): continua como Pagamento avulso tipo=caucao.
  // Caucao em 2x/3x usa CaucaoParcela em vez disso (ver gerarParcelasCaucao).
  if (dados.valorCaucao && dados.valorCaucao > 0 && (dados.caucaoNumeroParcelas ?? 1) <= 1) {
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

// Divide o valor total da caucao em N parcelas iguais (a ultima absorve o
// resto do arredondamento para o total fechar certinho), com vencimentos
// sugeridos em 0/30/60 dias a partir do inicio do contrato.
function calcularParcelasCaucao(valorTotal: number, numeroParcelas: number, dataInicio: Date) {
  const centavosTotal = Math.round(valorTotal * 100);
  const centavosPorParcela = Math.floor(centavosTotal / numeroParcelas);

  const parcelas: { numeroParcela: number; valorParcela: number; dataVencimento: Date }[] = [];
  let centavosRestantes = centavosTotal;

  for (let i = 1; i <= numeroParcelas; i++) {
    const ehUltima = i === numeroParcelas;
    const centavosDaParcela = ehUltima ? centavosRestantes : centavosPorParcela;
    centavosRestantes -= centavosDaParcela;

    const dataVencimento = new Date(dataInicio);
    dataVencimento.setDate(dataVencimento.getDate() + (i - 1) * 30);

    parcelas.push({ numeroParcela: i, valorParcela: centavosDaParcela / 100, dataVencimento });
  }

  return parcelas;
}

async function gerarParcelasCaucao(
  tx: Prisma.TransactionClient,
  contratoId: string,
  dados: { dataInicio: Date; valorCaucao?: number; caucaoNumeroParcelas?: number },
) {
  const numeroParcelas = dados.caucaoNumeroParcelas ?? 1;
  if (!dados.valorCaucao || dados.valorCaucao <= 0 || numeroParcelas <= 1) return;

  const parcelas = calcularParcelasCaucao(dados.valorCaucao, numeroParcelas, dados.dataInicio);
  await tx.caucaoParcela.createMany({
    data: parcelas.map((p) => ({
      contratoId,
      numeroParcela: p.numeroParcela,
      valorParcela: p.valorParcela,
      dataVencimento: p.dataVencimento,
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
    // Contratos pendentes de aprovacao (ou rejeitados) nunca aparecem na
    // listagem geral - so na tela dedicada "Contratos Pendentes". Isso vale
    // mesmo que filtros.status peca por eles (ver listarContratosQuerySchema,
    // que ja restringe os valores aceitos aqui a "ativo"/"encerrado").
    status: filtros.status ?? { in: ["ativo", "encerrado"] },
    imovelId: combinarFiltroImovel(filtros.imovelId, filtros.imovelIdsPermitidos ?? null),
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
      caucaoParcelas: { orderBy: { numeroParcela: "asc" } },
      contratoAnterior: true,
      contratoRenovado: true,
    },
  });
  if (!contrato) throw new AppError("Contrato nao encontrado", 404);
  return contrato;
}

// Envio ao Proprietario (best-effort: se o email mockado/SMTP falhar, o
// contrato ja foi criado e nao deve ser desfeito por isso).
async function notificarProprietariosContratoPendente(
  contrato: Prisma.ContratoGetPayload<{ include: typeof includePadrao }>,
) {
  try {
    const proprietarios = await prisma.usuario.findMany({ where: { role: "proprietario", ativo: true } });
    const corpo = [
      "Um novo contrato foi cadastrado por um Administrador e aguarda sua aprovação.",
      "",
      `Imóvel: ${contrato.imovel.logradouro}, ${contrato.imovel.numero}`,
      `Inquilino: ${contrato.inquilino.usuario.nome}`,
      `Valor do aluguel: R$ ${contrato.valorAluguel.toFixed(2)}`,
      `Período: ${contrato.dataInicio.toLocaleDateString("pt-BR")} a ${contrato.dataFim.toLocaleDateString("pt-BR")}`,
      "",
      "Acesse a tela \"Contratos Pendentes\" no sistema para aprovar ou rejeitar.",
    ].join("\n");

    for (const proprietario of proprietarios) {
      await enviarEmail({
        destinatario: proprietario.email,
        assunto: "[Sistema de Aluguéis] Novo contrato aguardando aprovação",
        corpo,
      });
    }
  } catch (err) {
    console.error("Falha ao notificar proprietarios sobre contrato pendente:", err);
  }
}

export async function criar(data: z.infer<typeof criarContratoSchema>, criador: { id: string; role: Role }) {
  const imovel = await prisma.imovel.findUnique({ where: { id: data.imovelId } });
  if (!imovel) throw new AppError("Imovel nao encontrado", 400);
  if (imovel.excluidoEm) throw new AppError("Este imovel foi excluido", 409);
  if (imovel.status === "alugado") {
    throw new AppError("Este imovel ja possui um contrato ativo", 409);
  }
  if (imovel.status === "inativo") {
    throw new AppError("Este imovel esta inativo e nao aceita novos contratos", 409);
  }

  const inquilino = await prisma.inquilino.findUnique({
    where: { id: data.inquilinoId },
    include: { usuario: true },
  });
  if (!inquilino) throw new AppError("Inquilino nao encontrado", 400);
  if (inquilino.excluidoEm) throw new AppError("Este inquilino foi excluido", 409);
  if (!inquilino.usuario.ativo) throw new AppError("Este inquilino esta inativo", 409);

  // Cadastrado por Administrador: nasce pendente de aprovacao do Proprietario -
  // sem pagamentos, sem ocupar o imovel e sem PDF ainda (gerados em aprovar()).
  if (criador.role === "administrador") {
    const contratoPendente = await prisma.contrato.create({
      data: {
        imovelId: data.imovelId,
        inquilinoId: data.inquilinoId,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        diaVencimento: data.diaVencimento,
        valorAluguel: data.valorAluguel,
        valorCaucao: data.valorCaucao,
        caucaoNumeroParcelas: data.caucaoNumeroParcelas ?? 1,
        status: "pendente_aprovacao",
        criadoPorId: criador.id,
      },
      include: includePadrao,
    });

    await notificarProprietariosContratoPendente(contratoPendente);
    return contratoPendente;
  }

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
        caucaoNumeroParcelas: data.caucaoNumeroParcelas ?? 1,
        status: "ativo",
        criadoPorId: criador.id,
        dataAprovacao: new Date(),
      },
    });

    await gerarPagamentosDoContrato(tx, contrato.id, data);
    await gerarParcelasCaucao(tx, contrato.id, data);
    await tx.imovel.update({ where: { id: data.imovelId }, data: { status: "alugado" } });

    return tx.contrato.findUniqueOrThrow({ where: { id: contrato.id }, include: includePadrao });
  });

  await gerarEAnexarContratoPdf(contratoCriado.id);
  return prisma.contrato.findUniqueOrThrow({ where: { id: contratoCriado.id }, include: includePadrao });
}

export async function listarPendentesAprovacao() {
  return prisma.contrato.findMany({
    where: { status: "pendente_aprovacao" },
    include: { ...includePadrao, criadoPor: { select: { nome: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function aprovar(id: string, aprovadorId: string) {
  const contrato = await prisma.contrato.findUnique({ where: { id }, include: { imovel: true } });
  if (!contrato) throw new AppError("Contrato nao encontrado", 404);
  if (contrato.status !== "pendente_aprovacao") {
    throw new AppError("Este contrato nao esta pendente de aprovacao", 409);
  }
  if (contrato.imovel.status === "alugado") {
    throw new AppError("Este imovel ja passou a ter outro contrato ativo enquanto este aguardava aprovacao", 409);
  }

  const dadosPagamento = {
    dataInicio: contrato.dataInicio,
    dataFim: contrato.dataFim,
    diaVencimento: contrato.diaVencimento,
    valorAluguel: contrato.valorAluguel,
    valorCaucao: contrato.valorCaucao ?? undefined,
    caucaoNumeroParcelas: contrato.caucaoNumeroParcelas,
  };

  const contratoAprovado = await prisma.$transaction(async (tx) => {
    await gerarPagamentosDoContrato(tx, contrato.id, dadosPagamento);
    await gerarParcelasCaucao(tx, contrato.id, dadosPagamento);
    await tx.imovel.update({ where: { id: contrato.imovelId }, data: { status: "alugado" } });

    return tx.contrato.update({
      where: { id },
      data: { status: "ativo", dataAprovacao: new Date(), aprovadoPorId: aprovadorId },
      include: includePadrao,
    });
  });

  await gerarEAnexarContratoPdf(contratoAprovado.id);
  return prisma.contrato.findUniqueOrThrow({ where: { id }, include: includePadrao });
}

export async function rejeitar(id: string, motivoRejeicao: string) {
  const contrato = await prisma.contrato.findUnique({ where: { id } });
  if (!contrato) throw new AppError("Contrato nao encontrado", 404);
  if (contrato.status !== "pendente_aprovacao") {
    throw new AppError("Este contrato nao esta pendente de aprovacao", 409);
  }

  return prisma.contrato.update({
    where: { id },
    data: { status: "rejeitado", motivoRejeicao, dataRejeicao: new Date() },
    include: includePadrao,
  });
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

export async function renovar(id: string, data: z.infer<typeof renovarContratoSchema>) {
  const contratoAtual = await buscarPorIdOuFalhar(id);
  if (contratoAtual.status !== "ativo") {
    throw new AppError("Somente contratos ativos podem ser renovados", 409);
  }

  const novoContratoCriado = await prisma.$transaction(async (tx) => {
    // Renovar equivale a encerrar o contrato atual e comecar um novo
    // (nao ha mais um status "renovado" distinto - ver AJUSTE 1 do polimento).
    await tx.contrato.update({ where: { id }, data: { status: "encerrado" } });

    const novoContrato = await tx.contrato.create({
      data: {
        imovelId: contratoAtual.imovelId,
        inquilinoId: contratoAtual.inquilinoId,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        diaVencimento: data.diaVencimento,
        valorAluguel: data.valorAluguel,
        valorCaucao: data.valorCaucao,
        caucaoNumeroParcelas: data.caucaoNumeroParcelas ?? 1,
        status: "ativo",
        contratoAnteriorId: id,
      },
    });

    await gerarPagamentosDoContrato(tx, novoContrato.id, data);
    await gerarParcelasCaucao(tx, novoContrato.id, data);
    await tx.imovel.update({ where: { id: contratoAtual.imovelId }, data: { status: "alugado" } });

    return tx.contrato.findUniqueOrThrow({ where: { id: novoContrato.id }, include: includePadrao });
  });

  await gerarEAnexarContratoPdf(novoContratoCriado.id);
  return prisma.contrato.findUniqueOrThrow({ where: { id: novoContratoCriado.id }, include: includePadrao });
}

export async function anexarContratoAssinado(id: string, url: string) {
  await buscarPorIdOuFalhar(id);
  return prisma.contrato.update({ where: { id }, data: { contratoAssinadoUrl: url }, include: includePadrao });
}

export async function removerContratoAssinado(id: string) {
  await buscarPorIdOuFalhar(id);
  return prisma.contrato.update({ where: { id }, data: { contratoAssinadoUrl: null }, include: includePadrao });
}

// Hard delete: so permitido se o contrato nao tiver nenhum historico
// financeiro (pagamentos ou parcelas de caucao) nem tiver sido renovado -
// na pratica, isso restringe a contratos pendente_aprovacao/rejeitado, ja
// que todo contrato aprovado sempre gera pagamentos.
export async function excluir(id: string) {
  await buscarPorIdOuFalhar(id);

  const [pagamentos, caucaoParcelas, renovacoesApontando] = await Promise.all([
    prisma.pagamento.count({ where: { contratoId: id } }),
    prisma.caucaoParcela.count({ where: { contratoId: id } }),
    prisma.contrato.count({ where: { contratoAnteriorId: id } }),
  ]);

  if (pagamentos + caucaoParcelas > 0) {
    throw new AppError(
      "Este contrato possui pagamentos ou parcelas de caução vinculados e não pode ser excluído definitivamente.",
      409,
    );
  }
  if (renovacoesApontando > 0) {
    throw new AppError("Este contrato foi renovado por outro contrato e não pode ser excluído definitivamente.", 409);
  }

  await prisma.contrato.delete({ where: { id } });
}
