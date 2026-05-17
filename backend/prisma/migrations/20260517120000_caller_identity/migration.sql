-- Null out empty phone strings before making column unique
UPDATE "User" SET phone = NULL WHERE phone = '';

-- Null out duplicate phones (keep newest account per phone)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY "createdAt" DESC) AS rn
  FROM "User"
  WHERE phone IS NOT NULL
)
UPDATE "User" SET phone = NULL
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Make User.phone unique
ALTER TABLE "User" ADD CONSTRAINT "User_phone_key" UNIQUE ("phone");

-- CreateTable Address
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "whatsappProfileId" TEXT,
    "label" TEXT,
    "houseNumber" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "Address_whatsappProfileId_idx" ON "Address"("whatsappProfileId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_whatsappProfileId_fkey" FOREIGN KEY ("whatsappProfileId") REFERENCES "WhatsAppProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
