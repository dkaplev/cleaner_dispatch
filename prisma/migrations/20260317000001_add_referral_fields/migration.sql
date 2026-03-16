-- Add referral tracking fields

-- Cleaners: unique short referral code + invite tracking
ALTER TABLE "public"."cleaners"
  ADD COLUMN IF NOT EXISTS "referral_code"           TEXT,
  ADD COLUMN IF NOT EXISTS "referral_invite_sent_at" TIMESTAMP(3);

-- Unique index on referral_code (allow NULLs — only enforce uniqueness on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "cleaners_referral_code_key"
  ON "public"."cleaners"("referral_code")
  WHERE "referral_code" IS NOT NULL;

-- Users: track which cleaner referred this landlord
ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "referred_by_cleaner_id" TEXT;
