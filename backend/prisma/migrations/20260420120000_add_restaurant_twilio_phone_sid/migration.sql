-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "twilioPhoneSid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_twilioPhoneSid_key" ON "Restaurant"("twilioPhoneSid");
