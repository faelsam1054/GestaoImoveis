-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GastoManutencao" (
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
    "formaPagamento" TEXT,
    "comprovantePdfUrl" TEXT,
    "comprovanteNomeOriginal" TEXT,
    "comprovanteTamanho" INTEGER,
    "comprovanteUploadEm" DATETIME,
    "observacoes" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'proprietario',
    "excluidoEm" DATETIME,
    "recorrencia" TEXT NOT NULL DEFAULT 'unica',
    "dataFimRecorrencia" DATETIME,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "manutencaoOrigemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GastoManutencao_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GastoManutencao_manutencaoOrigemId_fkey" FOREIGN KEY ("manutencaoOrigemId") REFERENCES "GastoManutencao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GastoManutencao" ("categoria", "comprovanteNomeOriginal", "comprovantePdfUrl", "comprovanteTamanho", "comprovanteUploadEm", "createdAt", "dataExecucao", "dataPagamento", "descricao", "excluidoEm", "formaPagamento", "id", "imovelId", "observacoes", "origem", "prestadorDocumento", "prestadorNome", "prestadorTelefone", "status", "updatedAt", "valor") SELECT "categoria", "comprovanteNomeOriginal", "comprovantePdfUrl", "comprovanteTamanho", "comprovanteUploadEm", "createdAt", "dataExecucao", "dataPagamento", "descricao", "excluidoEm", "formaPagamento", "id", "imovelId", "observacoes", "origem", "prestadorDocumento", "prestadorNome", "prestadorTelefone", "status", "updatedAt", "valor" FROM "GastoManutencao";
DROP TABLE "GastoManutencao";
ALTER TABLE "new_GastoManutencao" RENAME TO "GastoManutencao";
CREATE INDEX "GastoManutencao_imovelId_idx" ON "GastoManutencao"("imovelId");
CREATE INDEX "GastoManutencao_status_idx" ON "GastoManutencao"("status");
CREATE INDEX "GastoManutencao_categoria_idx" ON "GastoManutencao"("categoria");
CREATE INDEX "GastoManutencao_manutencaoOrigemId_idx" ON "GastoManutencao"("manutencaoOrigemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
