import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const SENHA_PADRAO = "demo1234";

async function hash(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

function competenciaDe(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  console.log("Iniciando seed...\n");
  const hoje = new Date();
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const senhaPadraoHash = await hash(SENHA_PADRAO);

  // ── 1. Tipos de imovel padrao ──────────────────────────────────────────
  const nomesTipos = ["Casa", "Apartamento", "Kitnet", "Sala Comercial", "Galpão", "Terreno"];
  const tipos: Record<string, string> = {};
  for (const nome of nomesTipos) {
    const tipo = await prisma.tipoImovel.upsert({ where: { nome }, update: {}, create: { nome } });
    tipos[nome] = tipo.id;
  }
  console.log(`✓ ${nomesTipos.length} tipos de imóvel`);

  // ── 2. Proprietario ─────────────────────────────────────────────────────
  const senhaProprietarioHash = await hash("admin123");
  await prisma.usuario.upsert({
    where: { email: "admin@sistema.com" },
    update: {},
    create: {
      nome: "Administrador Geral",
      email: "admin@sistema.com",
      senhaHash: senhaProprietarioHash,
      role: "proprietario",
      ativo: true,
      precisaTrocarSenha: false,
    },
  });
  console.log("✓ proprietario: admin@sistema.com / admin123");

  // ── 2b. Segundo proprietario (Ajuste 2: multiplos proprietarios) ────────
  await prisma.usuario.upsert({
    where: { email: "proprietario2@sistema.com" },
    update: {},
    create: {
      nome: "Rafaela Proprietária",
      email: "proprietario2@sistema.com",
      telefone: "11955551234",
      senhaHash: senhaProprietarioHash,
      role: "proprietario",
      ativo: true,
      precisaTrocarSenha: false,
    },
  });
  console.log("✓ segundo proprietario: proprietario2@sistema.com / admin123");

  // ── 3. Administradores (2, com permissoes diferentes) ────────────────────
  const admin1 = await prisma.usuario.upsert({
    where: { email: "administrador1@sistema.com" },
    update: {},
    create: {
      nome: "Carlos Administrador",
      email: "administrador1@sistema.com",
      senhaHash: senhaPadraoHash,
      role: "administrador",
      ativo: true,
      precisaTrocarSenha: false,
    },
  });
  await prisma.permissaoAdministrador.upsert({
    where: { usuarioId: admin1.id },
    update: {},
    create: {
      usuarioId: admin1.id,
      podeVerImoveis: true,
      podeEditarImoveis: true,
      podeVerInquilinos: true,
      podeEditarInquilinos: true,
      podeVerContratos: true,
      podeEditarContratos: false,
      podeVerPagamentos: true,
      podeRegistrarPagamentos: true,
      podeVerManutencao: true,
      podeCadastrarManutencao: true,
      podeVerAdministradores: false,
      podeEditarPerfil: true,
    },
  });

  const admin2 = await prisma.usuario.upsert({
    where: { email: "administrador2@sistema.com" },
    update: {},
    create: {
      nome: "Fernanda Administradora",
      email: "administrador2@sistema.com",
      senhaHash: senhaPadraoHash,
      role: "administrador",
      ativo: true,
      precisaTrocarSenha: false,
    },
  });
  await prisma.permissaoAdministrador.upsert({
    where: { usuarioId: admin2.id },
    update: {},
    create: {
      usuarioId: admin2.id,
      podeVerImoveis: true,
      podeEditarImoveis: false,
      podeVerInquilinos: false,
      podeEditarInquilinos: false,
      podeVerContratos: true,
      podeEditarContratos: false,
      podeVerPagamentos: true,
      podeRegistrarPagamentos: false,
      podeVerManutencao: true,
      podeCadastrarManutencao: false,
      podeVerAdministradores: false,
      podeEditarPerfil: true,
    },
  });
  console.log(`✓ 2 administradores: administrador1@sistema.com (acesso amplo), administrador2@sistema.com (somente leitura) / ${SENHA_PADRAO}`);

  // ── 4. Inquilinos (3, cada um com login) ─────────────────────────────────
  async function criarInquilino(email: string, nome: string, cpf: string, telefone: string) {
    const usuario = await prisma.usuario.upsert({
      where: { email },
      update: {},
      create: { nome, email, senhaHash: senhaPadraoHash, role: "inquilino", ativo: true, precisaTrocarSenha: false },
    });
    return prisma.inquilino.upsert({
      where: { usuarioId: usuario.id },
      update: {},
      create: {
        usuarioId: usuario.id,
        cpf,
        telefone,
        contatoEmergenciaNome: "Contato de Emergência",
        contatoEmergenciaTelefone: "11999990000",
      },
    });
  }

  const inquilino1 = await criarInquilino("inquilino1@sistema.com", "João Pereira", "11122233344", "11988887777");
  const inquilino2 = await criarInquilino("inquilino2@sistema.com", "Maria Souza", "22233344455", "11977776666");
  const inquilino3 = await criarInquilino("inquilino3@sistema.com", "Pedro Lima", "33344455566", "11966665555");
  const inquilino4 = await criarInquilino("inquilino4@sistema.com", "Ana Ribeiro", "44455566677", "11955554444");
  console.log(
    `✓ 4 inquilinos: inquilino1@sistema.com, inquilino2@sistema.com, inquilino3@sistema.com, inquilino4@sistema.com / ${SENHA_PADRAO}`,
  );

  // ── 5. Imoveis (3) ────────────────────────────────────────────────────────
  const imovel1 = await prisma.imovel.upsert({
    where: { id: "seed-imovel-1" },
    update: {},
    create: {
      id: "seed-imovel-1",
      tipoImovelId: tipos.Casa,
      logradouro: "Rua das Flores",
      numero: "123",
      bairro: "Jardim Primavera",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01234-000",
      valorAluguelBase: 2200,
      descricao: "Casa com 3 quartos, quintal e garagem para 2 carros.",
      status: "vago",
    },
  });
  const imovel2 = await prisma.imovel.upsert({
    where: { id: "seed-imovel-2" },
    update: {},
    create: {
      id: "seed-imovel-2",
      tipoImovelId: tipos.Apartamento,
      logradouro: "Avenida Central",
      numero: "456",
      complemento: "Apto 302",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01310-000",
      valorAluguelBase: 1800,
      descricao: "Apartamento de 2 quartos, próximo ao metrô.",
      status: "vago",
    },
  });
  const imovel3 = await prisma.imovel.upsert({
    where: { id: "seed-imovel-3" },
    update: {},
    create: {
      id: "seed-imovel-3",
      tipoImovelId: tipos.Kitnet,
      logradouro: "Rua dos Estudantes",
      numero: "789",
      bairro: "Vila Universitária",
      cidade: "São Paulo",
      estado: "SP",
      cep: "05508-000",
      valorAluguelBase: 950,
      descricao: "Kitnet mobiliada, ideal para estudantes.",
      status: "vago",
    },
  });
  const imovel4 = await prisma.imovel.upsert({
    where: { id: "seed-imovel-4" },
    update: {},
    create: {
      id: "seed-imovel-4",
      tipoImovelId: tipos["Sala Comercial"],
      logradouro: "Rua do Comércio",
      numero: "321",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01020-000",
      valorAluguelBase: 3000,
      descricao: "Sala comercial térrea, ideal para loja ou escritório.",
      status: "vago",
    },
  });
  const imovel5 = await prisma.imovel.upsert({
    where: { id: "seed-imovel-5" },
    update: {},
    create: {
      id: "seed-imovel-5",
      tipoImovelId: tipos.Terreno,
      logradouro: "Rua do Sítio",
      numero: "50",
      bairro: "Zona Rural",
      cidade: "São Paulo",
      estado: "SP",
      cep: "04567-000",
      valorAluguelBase: 500,
      descricao: "Terreno temporariamente fora de oferta para locação.",
      status: "inativo",
    },
  });
  const imovel6 = await prisma.imovel.upsert({
    where: { id: "seed-imovel-6" },
    update: {},
    create: {
      id: "seed-imovel-6",
      tipoImovelId: tipos.Apartamento,
      logradouro: "Rua Bela Vista",
      numero: "88",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01310-100",
      valorAluguelBase: 1600,
      descricao: "Apartamento reformado recentemente, ainda com um contrato aguardando aprovação.",
      status: "vago",
    },
  });
  console.log(
    "✓ 6 imóveis (Rua das Flores, Avenida Central, Rua dos Estudantes, Rua do Comércio, Rua do Sítio [inativo], Rua Bela Vista)",
  );

  // ── 5b. Vinculo de administradores a imoveis (Funcionalidade 1: acesso restrito por imovel) ──
  // upsert individual pois SQLite nao suporta skipDuplicates em createMany.
  for (const vinculo of [
    { administradorId: admin1.id, imovelId: imovel1.id },
    { administradorId: admin1.id, imovelId: imovel2.id },
    { administradorId: admin2.id, imovelId: imovel3.id },
  ]) {
    await prisma.adminImovel.upsert({
      where: { administradorId_imovelId: vinculo },
      update: {},
      create: vinculo,
    });
  }
  console.log("✓ administrador1 vinculado a 2 imóveis; administrador2 vinculado a 1 imóvel (acesso restrito)");

  // ── 6. Contratos ativos (2) com ~6 meses de historico de pagamentos ─────
  async function criarContratoComHistorico(
    imovelId: string,
    inquilinoId: string,
    mesesAtras: number,
    diaVencimento: number,
    valorAluguel: number,
  ) {
    // Verifica por qualquer contrato (nao so "ativo"): se o seed ja rodou antes e o
    // contrato de demonstracao foi encerrado/rescindido via uso real do app, nao
    // deve criar um novo por cima (evita duplicar dados a cada re-execucao do seed).
    const existente = await prisma.contrato.findFirst({ where: { imovelId } });
    if (existente) return existente;

    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1);
    const dataFim = new Date(dataInicio.getFullYear() + 1, dataInicio.getMonth(), dataInicio.getDate());

    const contrato = await prisma.contrato.create({
      data: {
        imovelId,
        inquilinoId,
        dataInicio,
        dataFim,
        diaVencimento,
        valorAluguel,
        valorCaucao: valorAluguel,
        status: "ativo",
      },
    });
    await prisma.imovel.update({ where: { id: imovelId }, data: { status: "alugado" } });

    await prisma.pagamento.create({
      data: {
        contratoId: contrato.id,
        tipo: "caucao",
        competencia: competenciaDe(dataInicio),
        valorPrevisto: valorAluguel,
        valorPago: valorAluguel,
        dataVencimento: dataInicio,
        dataPagamento: dataInicio,
        status: "pago",
        formaPagamento: "pix",
      },
    });

    let cursor = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
    const mesAtualCursor = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    while (cursor <= mesAtualCursor) {
      const ano = cursor.getFullYear();
      const mes = cursor.getMonth();
      const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
      const dia = Math.min(diaVencimento, ultimoDiaDoMes);
      const vencimento = new Date(ano, mes, dia);
      const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth();

      const dados = ehMesAtual
        ? {
            status: vencimento < hojeSemHora ? ("atrasado" as const) : ("pendente" as const),
            valorPago: null,
            dataPagamento: null,
            formaPagamento: null,
          }
        : {
            status: "pago" as const,
            valorPago: valorAluguel,
            dataPagamento: vencimento,
            formaPagamento: "pix" as const,
          };

      await prisma.pagamento.create({
        data: {
          contratoId: contrato.id,
          tipo: "aluguel",
          competencia: competenciaDe(cursor),
          valorPrevisto: valorAluguel,
          dataVencimento: vencimento,
          ...dados,
        },
      });

      cursor = new Date(ano, mes + 1, 1);
    }

    return contrato;
  }

  // Contrato com caucao parcelada em 3x (Funcionalidade 2): mesma logica de
  // split/vencimentos usada pelo backend (calcularParcelasCaucao), mas escrita
  // diretamente aqui pois o seed nao passa pela camada de servico.
  async function criarContratoComCaucaoParcelada(
    imovelId: string,
    inquilinoId: string,
    mesesAtras: number,
    diaVencimento: number,
    valorAluguel: number,
    valorCaucao: number,
  ) {
    // Verifica por qualquer contrato (nao so "ativo"): se o seed ja rodou antes e o
    // contrato de demonstracao foi encerrado/rescindido via uso real do app, nao
    // deve criar um novo por cima (evita duplicar dados a cada re-execucao do seed).
    const existente = await prisma.contrato.findFirst({ where: { imovelId } });
    if (existente) return existente;

    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1);
    const dataFim = new Date(dataInicio.getFullYear() + 1, dataInicio.getMonth(), dataInicio.getDate());

    const contrato = await prisma.contrato.create({
      data: {
        imovelId,
        inquilinoId,
        dataInicio,
        dataFim,
        diaVencimento,
        valorAluguel,
        valorCaucao,
        caucaoNumeroParcelas: 3,
        status: "ativo",
      },
    });
    await prisma.imovel.update({ where: { id: imovelId }, data: { status: "alugado" } });

    const valorParcela = valorCaucao / 3;
    const vencimentoParcela2 = new Date(dataInicio);
    vencimentoParcela2.setDate(vencimentoParcela2.getDate() + 30);
    const vencimentoParcela3 = new Date(dataInicio);
    vencimentoParcela3.setDate(vencimentoParcela3.getDate() + 60);

    await prisma.caucaoParcela.createMany({
      data: [
        {
          contratoId: contrato.id,
          numeroParcela: 1,
          valorParcela,
          dataVencimento: dataInicio,
          dataPagamento: dataInicio,
          status: "pago",
          formaPagamento: "pix",
        },
        {
          contratoId: contrato.id,
          numeroParcela: 2,
          valorParcela,
          dataVencimento: vencimentoParcela2,
          status: vencimentoParcela2 < hojeSemHora ? "atrasado" : "pendente",
        },
        {
          contratoId: contrato.id,
          numeroParcela: 3,
          valorParcela,
          dataVencimento: vencimentoParcela3,
          status: vencimentoParcela3 < hojeSemHora ? "atrasado" : "pendente",
        },
      ],
    });

    // Historico de pagamentos de aluguel, igual ao criarContratoComHistorico.
    let cursor = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
    const mesAtualCursor = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    while (cursor <= mesAtualCursor) {
      const ano = cursor.getFullYear();
      const mes = cursor.getMonth();
      const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
      const dia = Math.min(diaVencimento, ultimoDiaDoMes);
      const vencimento = new Date(ano, mes, dia);
      const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth();

      const dados = ehMesAtual
        ? {
            status: vencimento < hojeSemHora ? ("atrasado" as const) : ("pendente" as const),
            valorPago: null,
            dataPagamento: null,
            formaPagamento: null,
          }
        : {
            status: "pago" as const,
            valorPago: valorAluguel,
            dataPagamento: vencimento,
            formaPagamento: "pix" as const,
          };

      await prisma.pagamento.create({
        data: {
          contratoId: contrato.id,
          tipo: "aluguel",
          competencia: competenciaDe(cursor),
          valorPrevisto: valorAluguel,
          dataVencimento: vencimento,
          ...dados,
        },
      });

      cursor = new Date(ano, mes + 1, 1);
    }

    return contrato;
  }

  // diaVencimento=10 (mes atual ja passou -> demonstra pagamento em atraso)
  await criarContratoComHistorico(imovel1.id, inquilino1.id, 6, 10, 2200);
  // diaVencimento=25 (mes atual ainda nao chegou -> demonstra proximo vencimento)
  await criarContratoComHistorico(imovel2.id, inquilino2.id, 5, 25, 1800);
  // caucao de R$3.000 em 3x: parcela 1 paga, parcela 2 atrasada, parcela 3 pendente
  await criarContratoComCaucaoParcelada(imovel4.id, inquilino4.id, 1, 15, 3000, 3000);
  console.log(
    "✓ 3 contratos ativos: 2 com ~6 meses de histórico padrão, 1 com caução parcelada em 3x (1 paga, 1 atrasada, 1 pendente) " +
      "(imóvel 3 fica vago; imóvel 5 fica inativo)",
  );

  // ── 6b. Contrato pendente de aprovacao (Ajuste 1: aprovacao de contratos) ─
  // Simula um Administrador cadastrando um contrato: nasce com
  // statusAprovacao="pendente_aprovacao", sem gerar pagamentos nem ocupar o
  // imovel ainda (isso so acontece quando o Proprietario aprova, via
  // POST /contratos/:id/aprovar - ver contratos.service.ts).
  const contratoPendenteExistente = await prisma.contrato.findFirst({ where: { imovelId: imovel6.id } });
  let contratoPendente = contratoPendenteExistente;
  if (!contratoPendente) {
    const dataInicioPendente = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const dataFimPendente = new Date(dataInicioPendente.getFullYear() + 1, dataInicioPendente.getMonth(), 1);
    contratoPendente = await prisma.contrato.create({
      data: {
        imovelId: imovel6.id,
        inquilinoId: inquilino3.id,
        dataInicio: dataInicioPendente,
        dataFim: dataFimPendente,
        diaVencimento: 10,
        valorAluguel: 1600,
        status: "ativo",
        statusAprovacao: "pendente_aprovacao",
        criadoPorId: admin1.id,
      },
    });
  }
  console.log("✓ 1 contrato aguardando aprovação do Proprietário (cadastrado por administrador1, imóvel Rua Bela Vista)");

  // Email mockado correspondente (Ajuste 1: notificacao de contrato pendente).
  await prisma.emailEnviado.upsert({
    where: { id: "seed-email-1" },
    update: {},
    create: {
      id: "seed-email-1",
      destinatario: "admin@sistema.com",
      assunto: "[Sistema de Aluguéis] Novo contrato aguardando aprovação",
      corpo:
        "Um novo contrato foi cadastrado por um Administrador e aguarda sua aprovação.\n\n" +
        "Imóvel: Rua Bela Vista, 88\nInquilino: Pedro Lima\nValor do aluguel: R$ 1600.00\n\n" +
        'Acesse a tela "Contratos Pendentes" no sistema para aprovar ou rejeitar.',
      modoMock: true,
    },
  });
  console.log("✓ 1 email mockado de exemplo (tela Emails Enviados)");

  // ── 7. Gastos de manutencao (variados) ───────────────────────────────────
  const gastosExistentes = await prisma.gastoManutencao.count({
    where: { imovelId: { in: [imovel1.id, imovel2.id, imovel3.id] } },
  });
  if (gastosExistentes === 0) {
    await prisma.gastoManutencao.createMany({
      data: [
        {
          imovelId: imovel1.id,
          descricao: "Pintura externa e reparo no telhado",
          categoria: "pintura",
          valor: 1200,
          dataExecucao: new Date(hoje.getFullYear(), hoje.getMonth() - 2, 10),
          dataPagamento: new Date(hoje.getFullYear(), hoje.getMonth() - 2, 15),
          prestadorNome: "Pinturas Rápido Ltda",
          prestadorTelefone: "11933332222",
          status: "pago",
          origem: "proprietario",
        },
        {
          imovelId: imovel1.id,
          descricao: "Vazamento no cano da cozinha",
          categoria: "hidraulica",
          valor: 350,
          status: "aprovado",
          origem: "chamado_inquilino",
        },
        {
          imovelId: imovel2.id,
          descricao: "Troca do quadro de disjuntores",
          categoria: "eletrica",
          valor: 480,
          dataExecucao: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 5),
          dataPagamento: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 8),
          prestadorNome: "Eletricista Marcos",
          prestadorTelefone: "11922221111",
          status: "pago",
          origem: "proprietario",
        },
        {
          imovelId: imovel3.id,
          descricao: "Limpeza pós-obra antes de disponibilizar para locação",
          categoria: "limpeza",
          valor: 200,
          status: "orcamento",
          origem: "proprietario",
        },
      ],
    });
  }
  console.log("✓ gastos de manutenção (pintura, hidráulica, elétrica, limpeza)");

  // ── 7b. Manutencao recorrente (Ajuste 11) ────────────────────────────────
  // So a origem precisa ser semeada: as proximas instancias sao geradas de
  // forma preguicosa na proxima vez que GET /manutencao for chamado.
  const manutencaoRecorrenteExistente = await prisma.gastoManutencao.findFirst({
    where: { imovelId: imovel3.id, recorrencia: "mensal" },
  });
  if (!manutencaoRecorrenteExistente) {
    await prisma.gastoManutencao.create({
      data: {
        imovelId: imovel3.id,
        descricao: "Limpeza mensal da kitnet",
        categoria: "limpeza",
        valor: 150,
        dataExecucao: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
        prestadorNome: "Limpeza Express",
        status: "orcamento",
        origem: "proprietario",
        recorrencia: "mensal",
      },
    });
  }
  console.log("✓ 1 manutenção recorrente mensal (limpeza da kitnet - próximas ocorrências geradas ao abrir a tela)");

  // ── 8. Pagamentos de administrador (ultimos 3 meses, 2 administradores) ──
  const pagAdminExistentes = await prisma.pagamentoAdministrador.count({
    where: { administradorId: { in: [admin1.id, admin2.id] } },
  });
  if (pagAdminExistentes === 0) {
    for (const admin of [admin1, admin2]) {
      for (let i = 2; i >= 0; i--) {
        const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() - i, 5);
        const pago = i > 0;
        await prisma.pagamentoAdministrador.create({
          data: {
            administradorId: admin.id,
            mesReferencia: competenciaDe(dataVencimento),
            dataVencimento,
            valorPago: pago ? 800 : null,
            dataPagamento: pago ? dataVencimento : null,
            formaPagamento: pago ? "pix" : null,
            status: pago ? "pago" : "pendente",
          },
        });
      }
    }
  }
  console.log("✓ pagamentos de administrador dos últimos 3 meses\n");

  console.log("Seed concluído com sucesso!");
}

main()
  .catch((err) => {
    console.error("Falha ao rodar o seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
