-- Mensalidade de administrador passa a ser sempre calculada pelo sistema
-- (ver AJUSTE 6 do polimento): adiciona os campos de snapshot do calculo
-- (quantidadeImoveis/valorTotalAlugueis/percentual/valorPrevisto) e uma
-- constraint unica (administradorId, mesReferencia) para o calculo ser
-- idempotente (nunca gera duas mensalidades para o mesmo admin+mes).
--
-- Os 6 registros legados existentes (criados manualmente antes deste ajuste,
-- todos com valorPago=800 quando pagos) recebem um backfill best-effort:
-- valorPrevisto = valor pago (ou 800 para os ainda nao pagos, mesmo valor
-- fixo usado no seed antigo), valorTotalAlugueis = valorPrevisto / 10%,
-- percentual = 10, quantidadeImoveis = 1 (nao rastreado antes, sem forma de
-- recuperar o numero real de imoveis daquele calculo historico).

-- AlterTable
ALTER TABLE "PagamentoAdministrador" ADD COLUMN "quantidadeImoveis" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PagamentoAdministrador" ADD COLUMN "valorTotalAlugueis" REAL NOT NULL DEFAULT 8000;
ALTER TABLE "PagamentoAdministrador" ADD COLUMN "percentual" REAL NOT NULL DEFAULT 10;
ALTER TABLE "PagamentoAdministrador" ADD COLUMN "valorPrevisto" REAL NOT NULL DEFAULT 800;

-- Backfill dos registros legados (valorPrevisto = valor efetivamente pago,
-- quando ja pago; senao mantem o default 800 aplicado acima).
UPDATE "PagamentoAdministrador" SET "valorPrevisto" = "valorPago", "valorTotalAlugueis" = "valorPago" * 10
WHERE "valorPago" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoAdministrador_administradorId_mesReferencia_key" ON "PagamentoAdministrador"("administradorId", "mesReferencia");
