-- CreateTable
CREATE TABLE "EmailEnviado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "destinatario" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "modoMock" BOOLEAN NOT NULL DEFAULT true,
    "enviadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contrato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imovelId" TEXT NOT NULL,
    "inquilinoId" TEXT NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "valorAluguel" REAL NOT NULL,
    "valorCaucao" REAL,
    "caucaoNumeroParcelas" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "statusAprovacao" TEXT NOT NULL DEFAULT 'aprovado',
    "motivoRejeicao" TEXT,
    "dataRejeicao" DATETIME,
    "dataAprovacao" DATETIME,
    "criadoPorId" TEXT,
    "aprovadoPorId" TEXT,
    "contratoAnteriorId" TEXT,
    "arquivoPdfUrl" TEXT,
    "contratoAssinadoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contrato_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contrato_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Inquilino" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contrato_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contrato_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contrato_contratoAnteriorId_fkey" FOREIGN KEY ("contratoAnteriorId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contrato" ("arquivoPdfUrl", "caucaoNumeroParcelas", "contratoAnteriorId", "contratoAssinadoUrl", "createdAt", "dataFim", "dataInicio", "diaVencimento", "id", "imovelId", "inquilinoId", "status", "updatedAt", "valorAluguel", "valorCaucao") SELECT "arquivoPdfUrl", "caucaoNumeroParcelas", "contratoAnteriorId", "contratoAssinadoUrl", "createdAt", "dataFim", "dataInicio", "diaVencimento", "id", "imovelId", "inquilinoId", "status", "updatedAt", "valorAluguel", "valorCaucao" FROM "Contrato";
DROP TABLE "Contrato";
ALTER TABLE "new_Contrato" RENAME TO "Contrato";
CREATE UNIQUE INDEX "Contrato_contratoAnteriorId_key" ON "Contrato"("contratoAnteriorId");
CREATE INDEX "Contrato_imovelId_idx" ON "Contrato"("imovelId");
CREATE INDEX "Contrato_inquilinoId_idx" ON "Contrato"("inquilinoId");
CREATE INDEX "Contrato_status_idx" ON "Contrato"("status");
CREATE INDEX "Contrato_statusAprovacao_idx" ON "Contrato"("statusAprovacao");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EmailEnviado_enviadoEm_idx" ON "EmailEnviado"("enviadoEm");
