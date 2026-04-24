-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "whatsappPhone" TEXT,
ADD COLUMN "voicePhone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_whatsappPhone_key" ON "Restaurant"("whatsappPhone");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_voicePhone_key" ON "Restaurant"("voicePhone");
