-- AlterTable: Order — add restaurantName snapshot, make restaurantId nullable (SetNull on restaurant delete)
ALTER TABLE "Order" ADD COLUMN "restaurantName" TEXT;
ALTER TABLE "Order" ALTER COLUMN "restaurantId" DROP NOT NULL;
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_restaurantId_fkey";
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
