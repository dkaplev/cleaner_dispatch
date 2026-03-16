-- Track when a landlord's first calendar-triggered cleaning job was auto-dispatched
ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "first_auto_dispatch_at" TIMESTAMP(3);
