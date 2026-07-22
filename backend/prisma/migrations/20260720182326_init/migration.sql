-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "precisaTrocarSenha" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PermissaoAdministrador" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PermissaoAdministrador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TipoImovel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Imovel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipoImovelId" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "valorAluguelBase" REAL NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'vago',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Imovel_tipoImovelId_fkey" FOREIGN KEY ("tipoImovelId") REFERENCES "TipoImovel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImovelFoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imovelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImovelFoto_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inquilino" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "contatoEmergenciaNome" TEXT,
    "contatoEmergenciaTelefone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inquilino_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imovelId" TEXT NOT NULL,
    "inquilinoId" TEXT NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "valorAluguel" REAL NOT NULL,
    "valorCaucao" REAL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "contratoAnteriorId" TEXT,
    "arquivoPdfUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contrato_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contrato_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Inquilino" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contrato_contratoAnteriorId_fkey" FOREIGN KEY ("contratoAnteriorId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contratoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "valorPrevisto" REAL NOT NULL,
    "valorPago" REAL,
    "dataVencimento" DATETIME NOT NULL,
    "dataPagamento" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "formaPagamento" TEXT,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pagamento_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GastoManutencao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imovelId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "dataExecucao" DATETIME,
    "prestadorNome" TEXT,
    "prestadorDocumento" TEXT,
    "prestadorTelefone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'orcamento',
    "dataPagamento" DATETIME,
    "comprovantePdfUrl" TEXT,
    "observacoes" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'proprietario',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GastoManutencao_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PagamentoAdministrador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "administradorId" TEXT NOT NULL,
    "mesReferencia" TEXT NOT NULL,
    "valorPago" REAL,
    "dataPagamento" DATETIME,
    "dataVencimento" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "formaPagamento" TEXT,
    "observacoes" TEXT,
    "comprovantePdfUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PagamentoAdministrador_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReciboPdf" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pagamentoId" TEXT,
    "tipo" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "geradoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geradoPorId" TEXT NOT NULL,
    CONSTRAINT "ReciboPdf_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "Pagamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReciboPdf_geradoPorId_fkey" FOREIGN KEY ("geradoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "dadosAntes" TEXT,
    "dadosDepois" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE INDEX "PagamentoAdministrador_administradorId_idx" ON "PagamentoAdministrador"("administradorId");

-- CreateIndex
CREATE INDEX "PagamentoAdministrador_mesReferencia_idx" ON "PagamentoAdministrador"("mesReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "ReciboPdf_pagamentoId_key" ON "ReciboPdf"("pagamentoId");

-- CreateIndex
CREATE INDEX "LogAuditoria_usuarioId_idx" ON "LogAuditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "LogAuditoria_entidade_entidadeId_idx" ON "LogAuditoria"("entidade", "entidadeId");
