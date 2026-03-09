-- Add ingest_token to users table.
-- Used to build a per-landlord email forwarding address:
--   {INGEST_CENTRAL_EMAIL}+{ingest_token}@gmail.com
-- n8n extracts the +tag from the forwarded email's "to" field and sends it
-- to the ingest webhook, which looks up the landlord by this token.

ALTER TABLE "public"."users" ADD COLUMN "ingest_token" TEXT;

-- Generate tokens for all existing users using PostgreSQL's gen_random_bytes.
UPDATE "public"."users"
SET "ingest_token" = encode(gen_random_bytes(16), 'hex')
WHERE "ingest_token" IS NULL;

-- Unique constraint (Prisma requires this for @unique fields).
CREATE UNIQUE INDEX "users_ingest_token_key" ON "public"."users"("ingest_token");
