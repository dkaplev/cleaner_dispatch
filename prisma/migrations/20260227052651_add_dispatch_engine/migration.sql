-- CreateTable
CREATE TABLE "property_cleaners" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "cleaner_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_fallback" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_cleaners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_attempts" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "cleaner_id" TEXT NOT NULL,
    "offer_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offer_status" TEXT NOT NULL DEFAULT 'sent',
    "responded_at" TIMESTAMP(3),
    "batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "property_cleaners_property_id_cleaner_id_key" ON "property_cleaners"("property_id", "cleaner_id");

-- AddForeignKey
ALTER TABLE "property_cleaners" ADD CONSTRAINT "property_cleaners_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_cleaners" ADD CONSTRAINT "property_cleaners_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "cleaners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_attempts" ADD CONSTRAINT "dispatch_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_attempts" ADD CONSTRAINT "dispatch_attempts_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "cleaners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
