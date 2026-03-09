-- Add cleaning_trigger (when to schedule: after_checkout | before_checkin | both)
-- and checkin_time_default (used for before_checkin window end) to properties table.

ALTER TABLE "public"."properties"
  ADD COLUMN "cleaning_trigger" TEXT NOT NULL DEFAULT 'after_checkout';

ALTER TABLE "public"."properties"
  ADD COLUMN "checkin_time_default" TIMESTAMPTZ;
