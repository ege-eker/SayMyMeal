-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "pollToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_pollToken_key" ON "Restaurant"("pollToken");
