-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'OWNER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AlterTable: Add slug to Restaurant (nullable first, then backfill, then make required+unique)
ALTER TABLE "Restaurant" ADD COLUMN "slug" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "ownerId" TEXT;

-- Backfill existing restaurants with a slug derived from their id
UPDATE "Restaurant" SET "slug" = LOWER(REPLACE("id", '-', '')) WHERE "slug" IS NULL;

-- Now make slug required and unique
ALTER TABLE "Restaurant" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- AlterTable: Add userId to Order (nullable, no backfill needed)
ALTER TABLE "Order" ADD COLUMN "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
