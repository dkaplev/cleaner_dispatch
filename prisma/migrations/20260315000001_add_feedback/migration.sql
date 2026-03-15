-- Add feedback table for landlord-submitted feature requests, bug reports, and testimonials

CREATE TABLE "public"."feedback" (
  "id"         TEXT        NOT NULL,
  "user_id"    TEXT        NOT NULL,
  "category"   TEXT        NOT NULL DEFAULT 'general',
  "message"    TEXT        NOT NULL,
  "status"     TEXT        NOT NULL DEFAULT 'new',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "feedback_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "feedback_user_id_idx" ON "public"."feedback"("user_id");
CREATE INDEX "feedback_status_idx"   ON "public"."feedback"("status");
