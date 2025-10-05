-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "price" INTEGER NOT NULL DEFAULT 0;
