-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN     "comprovanteNomeOriginal" TEXT,
ADD COLUMN     "comprovanteTamanho" INTEGER,
ADD COLUMN     "comprovanteUploadEm" TIMESTAMP(3),
ADD COLUMN     "comprovanteUrl" TEXT;
