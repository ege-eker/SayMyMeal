-- AlterTable: Restaurant — add Meta WhatsApp Cloud API fields, drop legacy isActive
ALTER TABLE "Restaurant" ADD COLUMN "wabaId" TEXT,
ADD COLUMN "whatsappPhoneNumberId" TEXT,
ADD COLUMN "whatsappAccessToken" TEXT,
ADD COLUMN "whatsappPin" TEXT;

-- DropColumn: isActive was only used by the old single-Twilio-number WhatsApp fallback
ALTER TABLE "Restaurant" DROP COLUMN "isActive";

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_whatsappPhoneNumberId_key" ON "Restaurant"("whatsappPhoneNumberId");
