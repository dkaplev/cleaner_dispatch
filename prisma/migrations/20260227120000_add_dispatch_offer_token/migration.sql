-- AlterTable
ALTER TABLE "dispatch_attempts" ADD COLUMN "offer_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_attempts_offer_token_key" ON "dispatch_attempts"("offer_token");
