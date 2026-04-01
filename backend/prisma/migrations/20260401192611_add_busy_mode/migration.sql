-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "busyExtraMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "isBusy" BOOLEAN NOT NULL DEFAULT false;
