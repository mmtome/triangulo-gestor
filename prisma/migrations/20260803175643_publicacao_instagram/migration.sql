-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "aprovadoEm" TIMESTAMP(3),
ADD COLUMN     "aprovadoParaPublicar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aprovadoPorId" TEXT,
ADD COLUMN     "instagramMediaId" TEXT,
ADD COLUMN     "instagramPermalink" TEXT,
ADD COLUMN     "legenda" TEXT,
ADD COLUMN     "publicacaoErro" TEXT,
ADD COLUMN     "publicacaoStatus" TEXT,
ADD COLUMN     "publicadoEm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_aprovadoParaPublicar_publicadoEm_dueAt_idx" ON "Task"("aprovadoParaPublicar", "publicadoEm", "dueAt");
