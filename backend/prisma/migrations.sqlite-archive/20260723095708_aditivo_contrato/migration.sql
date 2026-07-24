-- CreateTable
CREATE TABLE "AditivoContrato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contratoId" TEXT NOT NULL,
    "contratoAnteriorId" TEXT,
    "descricaoAlteracoes" TEXT NOT NULL,
    "arquivoPdfUrl" TEXT NOT NULL,
    "dataAditivo" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorAnterior" REAL,
    "valorNovo" REAL,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AditivoContrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AditivoContrato_contratoAnteriorId_fkey" FOREIGN KEY ("contratoAnteriorId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AditivoContrato_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AditivoContrato_contratoId_idx" ON "AditivoContrato"("contratoId");
