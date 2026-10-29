-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('PENDING', 'SAVED', 'FAILED');

-- CreateTable
CREATE TABLE "ScannedLink" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "receiptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannedLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScannedLink_userId_status_idx" ON "ScannedLink"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScannedLink_userId_url_key" ON "ScannedLink"("userId", "url");

-- AddForeignKey
ALTER TABLE "ScannedLink" ADD CONSTRAINT "ScannedLink_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: receipts already imported keep their URL
INSERT INTO "ScannedLink" ("id", "userId", "url", "status", "receiptId", "updatedAt")
SELECT 'bf_' || "id", "userId", "sefazUrl", 'SAVED', "id", CURRENT_TIMESTAMP
FROM "Receipt"
ON CONFLICT ("userId", "url") DO NOTHING;
