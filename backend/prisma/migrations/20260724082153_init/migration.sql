-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "desativadoEm" TIMESTAMP(3),
    "precisaTrocarSenha" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissaoAdministrador" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "podeVerImoveis" BOOLEAN NOT NULL DEFAULT false,
    "podeEditarImoveis" BOOLEAN NOT NULL DEFAULT false,
    "podeVerInquilinos" BOOLEAN NOT NULL DEFAULT false,
    "podeEditarInquilinos" BOOLEAN NOT NULL DEFAULT false,
    "podeVerContratos" BOOLEAN NOT NULL DEFAULT false,
    "podeEditarContratos" BOOLEAN NOT NULL DEFAULT false,
    "podeVerPagamentos" BOOLEAN NOT NULL DEFAULT false,
    "podeRegistrarPagamentos" BOOLEAN NOT NULL DEFAULT false,
    "podeVerManutencao" BOOLEAN NOT NULL DEFAULT false,
    "podeCadastrarManutencao" BOOLEAN NOT NULL DEFAULT false,
    "podeVerAdministradores" BOOLEAN NOT NULL DEFAULT false,
    "podeEditarPerfil" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissaoAdministrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoImovel" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoImovel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Imovel" (
    "id" TEXT NOT NULL,
    "tipoImovelId" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "valorAluguelBase" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'vago',
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Imovel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminImovel" (
    "id" TEXT NOT NULL,
    "administradorId" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminImovel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImovelFoto" (
    "id" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImovelFoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquilino" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "contatoEmergenciaNome" TEXT,
    "contatoEmergenciaTelefone" TEXT,
    "excluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquilino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "inquilinoId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "valorAluguel" DOUBLE PRECISION NOT NULL,
    "valorCaucao" DOUBLE PRECISION,
    "caucaoNumeroParcelas" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "motivoRejeicao" TEXT,
    "dataRejeicao" TIMESTAMP(3),
    "dataAprovacao" TIMESTAMP(3),
    "criadoPorId" TEXT,
    "aprovadoPorId" TEXT,
    "contratoAnteriorId" TEXT,
    "arquivoPdfUrl" TEXT,
    "contratoAssinadoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AditivoContrato" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "contratoAnteriorId" TEXT,
    "descricaoAlteracoes" TEXT NOT NULL,
    "arquivoPdfUrl" TEXT NOT NULL,
    "dataAditivo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorAnterior" DOUBLE PRECISION,
    "valorNovo" DOUBLE PRECISION,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AditivoContrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaucaoParcela" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "numeroParcela" INTEGER NOT NULL,
    "valorParcela" DOUBLE PRECISION NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "formaPagamento" TEXT,
    "observacoes" TEXT,
    "reciboPdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaucaoParcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "valorPrevisto" DOUBLE PRECISION NOT NULL,
    "valorPago" DOUBLE PRECISION,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "formaPagamento" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoManutencao" (
    "id" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "dataExecucao" TIMESTAMP(3),
    "prestadorNome" TEXT,
    "prestadorDocumento" TEXT,
    "prestadorTelefone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'orcamento',
    "dataPagamento" TIMESTAMP(3),
    "formaPagamento" TEXT,
    "comprovantePdfUrl" TEXT,
    "comprovanteNomeOriginal" TEXT,
    "comprovanteTamanho" INTEGER,
    "comprovanteUploadEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'proprietario',
    "excluidoEm" TIMESTAMP(3),
    "recorrencia" TEXT NOT NULL DEFAULT 'unica',
    "dataFimRecorrencia" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "manutencaoOrigemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GastoManutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagamentoAdministrador" (
    "id" TEXT NOT NULL,
    "administradorId" TEXT NOT NULL,
    "mesReferencia" TEXT NOT NULL,
    "quantidadeImoveis" INTEGER NOT NULL,
    "valorTotalAlugueis" DOUBLE PRECISION NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "valorPrevisto" DOUBLE PRECISION NOT NULL,
    "valorPago" DOUBLE PRECISION,
    "dataPagamento" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aguardando_pagamento',
    "formaPagamento" TEXT,
    "observacoes" TEXT,
    "comprovantePdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagamentoAdministrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReciboPdf" (
    "id" TEXT NOT NULL,
    "pagamentoId" TEXT,
    "tipo" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geradoPorId" TEXT NOT NULL,

    CONSTRAINT "ReciboPdf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "dadosAntes" TEXT,
    "dadosDepois" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEnviado" (
    "id" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "modoMock" BOOLEAN NOT NULL DEFAULT true,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEnviado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_role_idx" ON "Usuario"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_usuarioId_idx" ON "RefreshToken"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissaoAdministrador_usuarioId_key" ON "PermissaoAdministrador"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoImovel_nome_key" ON "TipoImovel"("nome");

-- CreateIndex
CREATE INDEX "Imovel_tipoImovelId_idx" ON "Imovel"("tipoImovelId");

-- CreateIndex
CREATE INDEX "Imovel_status_idx" ON "Imovel"("status");

-- CreateIndex
CREATE INDEX "AdminImovel_administradorId_idx" ON "AdminImovel"("administradorId");

-- CreateIndex
CREATE INDEX "AdminImovel_imovelId_idx" ON "AdminImovel"("imovelId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminImovel_administradorId_imovelId_key" ON "AdminImovel"("administradorId", "imovelId");

-- CreateIndex
CREATE INDEX "ImovelFoto_imovelId_idx" ON "ImovelFoto"("imovelId");

-- CreateIndex
CREATE UNIQUE INDEX "Inquilino_usuarioId_key" ON "Inquilino"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Inquilino_cpf_key" ON "Inquilino"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_contratoAnteriorId_key" ON "Contrato"("contratoAnteriorId");

-- CreateIndex
CREATE INDEX "Contrato_imovelId_idx" ON "Contrato"("imovelId");

-- CreateIndex
CREATE INDEX "Contrato_inquilinoId_idx" ON "Contrato"("inquilinoId");

-- CreateIndex
CREATE INDEX "Contrato_status_idx" ON "Contrato"("status");

-- CreateIndex
CREATE INDEX "AditivoContrato_contratoId_idx" ON "AditivoContrato"("contratoId");

-- CreateIndex
CREATE INDEX "CaucaoParcela_contratoId_idx" ON "CaucaoParcela"("contratoId");

-- CreateIndex
CREATE INDEX "CaucaoParcela_status_idx" ON "CaucaoParcela"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CaucaoParcela_contratoId_numeroParcela_key" ON "CaucaoParcela"("contratoId", "numeroParcela");

-- CreateIndex
CREATE INDEX "Pagamento_contratoId_idx" ON "Pagamento"("contratoId");

-- CreateIndex
CREATE INDEX "Pagamento_competencia_idx" ON "Pagamento"("competencia");

-- CreateIndex
CREATE INDEX "Pagamento_status_idx" ON "Pagamento"("status");

-- CreateIndex
CREATE INDEX "GastoManutencao_imovelId_idx" ON "GastoManutencao"("imovelId");

-- CreateIndex
CREATE INDEX "GastoManutencao_status_idx" ON "GastoManutencao"("status");

-- CreateIndex
CREATE INDEX "GastoManutencao_categoria_idx" ON "GastoManutencao"("categoria");

-- CreateIndex
CREATE INDEX "GastoManutencao_manutencaoOrigemId_idx" ON "GastoManutencao"("manutencaoOrigemId");

-- CreateIndex
CREATE INDEX "PagamentoAdministrador_administradorId_idx" ON "PagamentoAdministrador"("administradorId");

-- CreateIndex
CREATE INDEX "PagamentoAdministrador_mesReferencia_idx" ON "PagamentoAdministrador"("mesReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoAdministrador_administradorId_mesReferencia_key" ON "PagamentoAdministrador"("administradorId", "mesReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "ReciboPdf_pagamentoId_key" ON "ReciboPdf"("pagamentoId");

-- CreateIndex
CREATE INDEX "LogAuditoria_usuarioId_idx" ON "LogAuditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "LogAuditoria_entidade_entidadeId_idx" ON "LogAuditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "EmailEnviado_enviadoEm_idx" ON "EmailEnviado"("enviadoEm");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissaoAdministrador" ADD CONSTRAINT "PermissaoAdministrador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Imovel" ADD CONSTRAINT "Imovel_tipoImovelId_fkey" FOREIGN KEY ("tipoImovelId") REFERENCES "TipoImovel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminImovel" ADD CONSTRAINT "AdminImovel_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminImovel" ADD CONSTRAINT "AdminImovel_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImovelFoto" ADD CONSTRAINT "ImovelFoto_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquilino" ADD CONSTRAINT "Inquilino_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Inquilino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_contratoAnteriorId_fkey" FOREIGN KEY ("contratoAnteriorId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AditivoContrato" ADD CONSTRAINT "AditivoContrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AditivoContrato" ADD CONSTRAINT "AditivoContrato_contratoAnteriorId_fkey" FOREIGN KEY ("contratoAnteriorId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AditivoContrato" ADD CONSTRAINT "AditivoContrato_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaucaoParcela" ADD CONSTRAINT "CaucaoParcela_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoManutencao" ADD CONSTRAINT "GastoManutencao_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoManutencao" ADD CONSTRAINT "GastoManutencao_manutencaoOrigemId_fkey" FOREIGN KEY ("manutencaoOrigemId") REFERENCES "GastoManutencao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoAdministrador" ADD CONSTRAINT "PagamentoAdministrador_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReciboPdf" ADD CONSTRAINT "ReciboPdf_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "Pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReciboPdf" ADD CONSTRAINT "ReciboPdf_geradoPorId_fkey" FOREIGN KEY ("geradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
