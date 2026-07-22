-- CreateTable
CREATE TABLE "CaucaoParcela" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contratoId" TEXT NOT NULL,
    "numeroParcela" INTEGER NOT NULL,
    "valorParcela" REAL NOT NULL,
    "dataVencimento" DATETIME NOT NULL,
    "dataPagamento" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "formaPagamento" TEXT,
    "observacoes" TEXT,
    "reciboPdfUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaucaoParcela_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "contratoAnteriorId" TEXT,
    "arquivoPdfUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contrato_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contrato_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Inquilino" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contrato_contratoAnteriorId_fkey" FOREIGN KEY ("contratoAnteriorId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contrato" ("arquivoPdfUrl", "contratoAnteriorId", "createdAt", "dataFim", "dataInicio", "diaVencimento", "id", "imovelId", "inquilinoId", "status", "updatedAt", "valorAluguel", "valorCaucao") SELECT "arquivoPdfUrl", "contratoAnteriorId", "createdAt", "dataFim", "dataInicio", "diaVencimento", "id", "imovelId", "inquilinoId", "status", "updatedAt", "valorAluguel", "valorCaucao" FROM "Contrato";
DROP TABLE "Contrato";
ALTER TABLE "new_Contrato" RENAME TO "Contrato";
CREATE UNIQUE INDEX "Contrato_contratoAnteriorId_key" ON "Contrato"("contratoAnteriorId");
CREATE INDEX "Contrato_imovelId_idx" ON "Contrato"("imovelId");
CREATE INDEX "Contrato_inquilinoId_idx" ON "Contrato"("inquilinoId");
CREATE INDEX "Contrato_status_idx" ON "Contrato"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CaucaoParcela_contratoId_idx" ON "CaucaoParcela"("contratoId");

-- CreateIndex
CREATE INDEX "CaucaoParcela_status_idx" ON "CaucaoParcela"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CaucaoParcela_contratoId_numeroParcela_key" ON "CaucaoParcela"("contratoId", "numeroParcela");
