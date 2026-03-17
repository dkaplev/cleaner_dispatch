-- Add referral_paid_at to users table
-- Set by admin after confirming the referred landlord paid their first month.
ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "referral_paid_at" TIMESTAMP(3);
