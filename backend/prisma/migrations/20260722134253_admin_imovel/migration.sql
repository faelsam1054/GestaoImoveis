-- CreateTable
CREATE TABLE "AdminImovel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "administradorId" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminImovel_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdminImovel_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AdminImovel_administradorId_idx" ON "AdminImovel"("administradorId");

-- CreateIndex
CREATE INDEX "AdminImovel_imovelId_idx" ON "AdminImovel"("imovelId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminImovel_administradorId_imovelId_key" ON "AdminImovel"("administradorId", "imovelId");
