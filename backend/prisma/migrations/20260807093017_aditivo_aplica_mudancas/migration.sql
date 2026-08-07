-- AditivoContrato passa a aplicar mudancas reais no Contrato (mesmo registro,
-- nunca cria um contrato novo - ver aditivos.service.ts). contratoAnteriorId
-- e removido: o rastro de linhagem de renovacao ja existe separadamente em
-- Contrato.contratoAnteriorId, entao nao ha perda de informacao.
--
-- valorAnterior/valorNovo sao renomeados (RENAME COLUMN, preserva dados) para
-- valorAluguelAnterior/valorAluguelNovo, e ganham os equivalentes para dia de
-- vencimento e data fim - os 3 campos que um aditivo agora pode alterar de
-- verdade no contrato.

-- DropForeignKey
ALTER TABLE "AditivoContrato" DROP CONSTRAINT "AditivoContrato_contratoAnteriorId_fkey";

-- DropColumn
ALTER TABLE "AditivoContrato" DROP COLUMN "contratoAnteriorId";

-- RenameColumn (preserva os dados do unico registro existente)
ALTER TABLE "AditivoContrato" RENAME COLUMN "valorAnterior" TO "valorAluguelAnterior";
ALTER TABLE "AditivoContrato" RENAME COLUMN "valorNovo" TO "valorAluguelNovo";

-- AddColumn
ALTER TABLE "AditivoContrato" ADD COLUMN "diaVencimentoAnterior" INTEGER;
ALTER TABLE "AditivoContrato" ADD COLUMN "diaVencimentoNovo" INTEGER;
ALTER TABLE "AditivoContrato" ADD COLUMN "dataFimAnterior" TIMESTAMP(3);
ALTER TABLE "AditivoContrato" ADD COLUMN "dataFimNovo" TIMESTAMP(3);

-- AlterColumn (arquivoPdfUrl passa a ser opcional)
ALTER TABLE "AditivoContrato" ALTER COLUMN "arquivoPdfUrl" DROP NOT NULL;
