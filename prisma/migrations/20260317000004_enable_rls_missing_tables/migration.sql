-- Enable RLS on tables created after the initial rls-enable migration.
-- feedback, calendar_feeds, and calendar_bookings were created in later
-- migrations and therefore missed the blanket RLS pass.
-- With RLS enabled and no permissive policies the PostgREST/anon access
-- is denied by default; Prisma (postgres superuser) is unaffected.

ALTER TABLE "public"."feedback"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."calendar_feeds"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."calendar_bookings" ENABLE ROW LEVEL SECURITY;
