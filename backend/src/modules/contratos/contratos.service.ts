import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import { gerarContratoPdf } from "../../services/pdf/contrato.pdf";
import { combinarFiltroImovel } from "../administradores/acesso-imovel.service";
import { enviarEmail } from "../email/email.service";
import { criarNotificacao } from "../notificacoes/notificacoes.service";
import { atualizarAtrasados } from "../pagamentos/pagamentos.service";
import type {
  criarContratoSchema,
  renovarContratoSchema,
  atualizarValoresContratoSchema,
  atualizarPagamentosLoteSchema,
} from "./contratos.schema";
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

function competenciaAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

// Mesmo clamping de dia usado em gerarCompetencias (ex: dia 31 em fevereiro
// cai no dia 28/29), mas a partir de uma competencia "YYYY-MM" ja existente
// em vez de varrer um intervalo - usado para corrigir a data de um Pagamento
// ja gerado quando o dia de vencimento do contrato muda.
function dataComNovoDia(competencia: string, dia: number): Date {
  const [anoStr, mesStr] = competencia.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr) - 1;
  const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(dia, ultimoDiaDoMes));
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
        assunto: "[ImovelClaro] Novo contrato aguardando aprovação",
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
  // sem pagamentos e sem ocupar o imovel ainda. O PDF ja e gerado aqui (nao so
  // em aprovar()) para o Proprietario poder visualizar o contrato antes de
  // decidir aprovar ou rejeitar.
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

    await gerarEAnexarContratoPdf(contratoPendente.id);
    await notificarProprietariosContratoPendente(contratoPendente);
    return prisma.contrato.findUniqueOrThrow({ where: { id: contratoPendente.id }, include: includePadrao });
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

  // Normalmente ja foi gerado na criacao (ver criar()); regenera aqui so como
  // fallback defensivo caso aquela geracao tenha falhado silenciosamente.
  if (!contratoAprovado.arquivoPdfUrl) {
    await gerarEAnexarContratoPdf(contratoAprovado.id);
  }
  return prisma.contrato.findUniqueOrThrow({ where: { id }, include: includePadrao });
}

export async function rejeitar(id: string, motivoRejeicao: string) {
  const contrato = await prisma.contrato.findUnique({ where: { id }, include: { imovel: true } });
  if (!contrato) throw new AppError("Contrato nao encontrado", 404);
  if (contrato.status !== "pendente_aprovacao") {
    throw new AppError("Este contrato nao esta pendente de aprovacao", 409);
  }

  const contratoRejeitado = await prisma.contrato.update({
    where: { id },
    data: { status: "rejeitado", motivoRejeicao, dataRejeicao: new Date() },
    include: includePadrao,
  });

  // Best-effort: contrato ja foi rejeitado, a notificacao nao deve desfazer isso.
  // criadoPorId so e nulo para contratos legados/criados fora desse fluxo - nada a notificar.
  if (contrato.criadoPorId) {
    try {
      await criarNotificacao({
        usuarioId: contrato.criadoPorId,
        tipo: "CONTRATO_REJEITADO",
        titulo: "Contrato rejeitado",
        mensagem: `O contrato do imóvel ${contrato.imovel.logradouro}, ${contrato.imovel.numero} foi rejeitado pelo Proprietário. Motivo: ${motivoRejeicao}`,
        entidade: "Contrato",
        entidadeId: contrato.id,
      });
    } catch (err) {
      console.error("Falha ao notificar administrador sobre rejeicao de contrato:", err);
    }
  }

  return contratoRejeitado;
}

async function liberarImovelSeSemContratoAtivo(tx: Prisma.TransactionClient, imovelId: string) {
  const aindaAtivo = await tx.contrato.findFirst({ where: { imovelId, status: "ativo" } });
  if (!aindaAtivo) {
    await tx.imovel.update({ where: { id: imovelId }, data: { status: "vago" } });
  }
}

// gerarPagamentosDoContrato() pre-gera TODOS os pagamentos mensais do
// contrato de uma vez (dataInicio ate dataFim), no momento da criacao. Ao
// encerrar (ou renovar, para o contrato anterior) antes do dataFim natural,
// os pagamentos futuros que ainda nao foram cobrados ficariam orfaos, para
// sempre "pendente"/"atrasado" - nunca serao cobrados de verdade (o
// inquilino nao mora mais no imovel), mas continuavam contando como receita
// esperada. Cancela-os aqui em vez de apagar (mantem o registro/auditoria de
// que aquele mes foi pre-gerado e depois cancelado).
async function cancelarPagamentosFuturosPendentes(tx: Prisma.TransactionClient, contratoId: string) {
  await tx.pagamento.updateMany({
    where: { contratoId, status: { in: ["pendente", "atrasado"] } },
    data: { status: "cancelado" },
  });
}

export async function encerrar(id: string, quebraContratoUrl?: string) {
  const contrato = await buscarPorIdOuFalhar(id);
  if (contrato.status !== "ativo") {
    throw new AppError("Somente contratos ativos podem ser encerrados", 409);
  }

  return prisma.$transaction(async (tx) => {
    const atualizado = await tx.contrato.update({
      where: { id },
      data: { status: "encerrado", quebraContratoUrl },
    });
    await cancelarPagamentosFuturosPendentes(tx, id);
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
    await cancelarPagamentosFuturosPendentes(tx, id);

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

// Edicao pontual de valor do aluguel/dia de vencimento num contrato ja
// ativo (fora do fluxo de renovacao). Diferente de renovar(), nao cria um
// novo contrato nem mexe em pagamentos ja pagos/cancelados - so
// opcionalmente reajusta os Pagamentos tipo=aluguel que ainda estao
// pendentes/atrasados a partir da competencia atual (os de competencias
// passadas sao deixados como estavam - representam inadimplencia historica,
// nao um erro de cadastro a corrigir).
export async function atualizarValores(id: string, data: z.infer<typeof atualizarValoresContratoSchema>) {
  const contrato = await buscarPorIdOuFalhar(id);
  // Encerrado tambem e permitido: nao ha pagamento pendente/atrasado sobrando
  // num contrato encerrado (foram cancelados no momento do encerramento - ver
  // cancelarPagamentosFuturosPendentes), entao editar aqui e so correcao de
  // dado historico/cadastral, sem risco de afetar cobranca real. Pendente de
  // aprovacao/rejeitado continuam bloqueados - nao ha valor "real" ainda pra editar.
  if (contrato.status !== "ativo" && contrato.status !== "encerrado") {
    throw new AppError("Somente contratos ativos ou encerrados podem ter os valores editados", 409);
  }

  const diaVencimentoMudou = data.diaVencimento !== undefined && data.diaVencimento !== contrato.diaVencimento;
  let pagamentosAtualizados = 0;

  const atualizado = await prisma.$transaction(async (tx) => {
    const atualizado = await tx.contrato.update({
      where: { id },
      data: {
        ...(data.valorAluguel !== undefined ? { valorAluguel: data.valorAluguel } : {}),
        ...(data.diaVencimento !== undefined ? { diaVencimento: data.diaVencimento } : {}),
      },
      include: includePadrao,
    });

    if (data.valorAluguel !== undefined && data.atualizarPagamentosFuturos) {
      await tx.pagamento.updateMany({
        where: {
          contratoId: id,
          tipo: "aluguel",
          status: "pendente",
          dataVencimento: { gte: new Date() },
        },
        data: { valorPrevisto: data.valorAluguel },
      });
    }

    // Propaga o novo dia de vencimento para os Pagamentos ja gerados (mes
    // atual em diante) - sem isso, o dia fica desatualizado no pagamento
    // para sempre (era exatamente esse o bug relatado). Agrupa por
    // competencia porque cada mes precisa de um Date diferente (mesmo
    // ano/mes, dia clampado ao ultimo dia do mes quando necessario).
    if (diaVencimentoMudou && data.diaVencimento !== undefined && data.atualizarDataVencimentoPendentes) {
      const afetados = await tx.pagamento.findMany({
        where: {
          contratoId: id,
          tipo: "aluguel",
          status: { in: ["pendente", "atrasado"] },
          competencia: { gte: competenciaAtual() },
        },
        select: { competencia: true },
        distinct: ["competencia"],
      });

      for (const { competencia } of afetados) {
        const { count } = await tx.pagamento.updateMany({
          where: {
            contratoId: id,
            tipo: "aluguel",
            status: { in: ["pendente", "atrasado"] },
            competencia,
          },
          data: { dataVencimento: dataComNovoDia(competencia, data.diaVencimento) },
        });
        pagamentosAtualizados += count;
      }
    }

    return atualizado;
  });

  // Fora da transacao, best-effort (mesmo padrao ja usado em toda leitura de
  // pagamentos): reclassifica pendente/atrasado apos a mudanca de data - ex.
  // um pagamento atrasado cujo vencimento acabou de ser prorrogado pra
  // frente volta a ser "pendente".
  if (diaVencimentoMudou) {
    await atualizarAtrasados();
  }

  return { ...atualizado, pagamentosAtualizados };
}

// Aplica o valor ATUAL do contrato (Contrato.valorAluguel) aos Pagamentos
// tipo=aluguel a partir da competencia informada, cobrindo tambem os ja
// "atrasado" (diferente de atualizarValores/atualizarPagamentosFuturos, que
// so pega "pendente" - aqui o proprietario esta corrigindo retroativamente
// um lote que ficou com o valor errado).
export async function atualizarPagamentosEmLote(id: string, data: z.infer<typeof atualizarPagamentosLoteSchema>) {
  const contrato = await buscarPorIdOuFalhar(id);
  if (contrato.status !== "ativo") {
    throw new AppError("Somente contratos ativos podem ter pagamentos atualizados em lote", 409);
  }

  const { count } = await prisma.pagamento.updateMany({
    where: {
      contratoId: id,
      tipo: "aluguel",
      status: { in: ["pendente", "atrasado"] },
      competencia: { gte: data.mesInicio },
    },
    data: { valorPrevisto: contrato.valorAluguel },
  });

  return { pagamentosAtualizados: count, valorAplicado: contrato.valorAluguel };
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
