-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'RESTORE_PROJECT';
ALTER TYPE "ActivityAction" ADD VALUE 'LOCK_USER';
ALTER TYPE "ActivityAction" ADD VALUE 'UNLOCK_USER';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETE_USER';
ALTER TYPE "ActivityAction" ADD VALUE 'RESTORE_USER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
