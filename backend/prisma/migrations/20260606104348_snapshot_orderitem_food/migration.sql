-- AlterTable: OrderItem — make foodId nullable (SetNull on food delete), add snapshot fields
ALTER TABLE "OrderItem" ALTER COLUMN "foodId" DROP NOT NULL;
ALTER TABLE "OrderItem" ADD COLUMN "foodName" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "basePrice" DECIMAL(65,30);

-- Drop old CASCADE constraint and add SetNull
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_foodId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_foodId_fkey"
  FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;
