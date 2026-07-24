-- Fusao de Contrato.statusAprovacao dentro de Contrato.status, e remocao do
-- eixo "ativo"/"desativadoEm" (soft delete de visibilidade retirado).
--
-- Migracao de dados (precisa rodar ANTES de dropar as colunas, senao perdemos
-- a informacao necessaria para decidir o novo valor de "status"):
--   1) Contratos com statusAprovacao pendente/rejeitado: status vira igual a
--      statusAprovacao (pendente_aprovacao/rejeitado), independente do status
--      anterior (que so era "ativo" por padrao nesses casos).
--   2) Contratos aprovados com status legado (rescindido/renovado/inativo):
--      todos viram "encerrado" (rescindir e renovar deixam de existir como
--      estados distintos - ver AJUSTE 1 do polimento).
--   3) O campo "ativo" (boolean de visibilidade) e dropado sem migracao de
--      dados: os poucos contratos com ativo=false ja tinham status
--      encerrado/rescindido (-> encerrado), entao nao ha perda de informacao
--      util - eles simplesmente voltam a aparecer na listagem padrao, que e
--      o comportamento correto agora que esse recurso foi removido.

UPDATE "Contrato" SET "status" = "statusAprovacao"
WHERE "statusAprovacao" IN ('pendente_aprovacao', 'rejeitado');

UPDATE "Contrato" SET "status" = 'encerrado'
WHERE "statusAprovacao" = 'aprovado' AND "status" IN ('rescindido', 'renovado', 'inativo');

-- DropIndex (precisa vir ANTES do DROP COLUMN correspondente, senao o
-- SQLite recusa remover a coluna com "no such column" ao tentar reindexar).
DROP INDEX IF EXISTS "Contrato_statusAprovacao_idx";

-- AlterTable
ALTER TABLE "Contrato" DROP COLUMN "ativo";
ALTER TABLE "Contrato" DROP COLUMN "desativadoEm";
ALTER TABLE "Contrato" DROP COLUMN "statusAprovacao";
