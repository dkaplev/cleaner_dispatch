-- Enable Row Level Security (RLS) on all public tables exposed to PostgREST.
-- Fixes Supabase linter: "RLS Disabled in Public" and "Sensitive Columns Exposed".
-- With RLS enabled and no permissive policies for anon/authenticated, API access
-- to these tables is denied. Your app uses Prisma with the DB connection string
-- (postgres/superuser), which bypasses RLS, so backend access is unchanged.

ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cleaners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cleanings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."job_media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."property_cleaners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."dispatch_attempts" ENABLE ROW LEVEL SECURITY;
