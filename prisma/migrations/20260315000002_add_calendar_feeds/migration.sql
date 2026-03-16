-- Calendar feed sync: per-property iCal URL subscriptions + booking tracking

CREATE TABLE "public"."calendar_feeds" (
  "id"             TEXT        NOT NULL,
  "property_id"    TEXT        NOT NULL,
  "url"            TEXT        NOT NULL,
  "source"         TEXT        NOT NULL DEFAULT 'other',
  "label"          TEXT,
  "last_synced_at" TIMESTAMPTZ,
  "sync_error"     TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_feeds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_feeds_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "calendar_feeds_property_id_idx" ON "public"."calendar_feeds"("property_id");

CREATE TABLE "public"."calendar_bookings" (
  "id"         TEXT        NOT NULL,
  "feed_id"    TEXT        NOT NULL,
  "uid"        TEXT        NOT NULL,
  "checkin"    TIMESTAMPTZ NOT NULL,
  "checkout"   TIMESTAMPTZ NOT NULL,
  "job_id"     TEXT,
  "status"     TEXT        NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_bookings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_bookings_feed_uid_key" UNIQUE ("feed_id", "uid"),
  CONSTRAINT "calendar_bookings_feed_id_fkey"
    FOREIGN KEY ("feed_id") REFERENCES "public"."calendar_feeds"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "calendar_bookings_feed_id_idx"  ON "public"."calendar_bookings"("feed_id");
CREATE INDEX "calendar_bookings_status_idx"   ON "public"."calendar_bookings"("status");
