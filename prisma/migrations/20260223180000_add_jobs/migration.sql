-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "landlord_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assigned_cleaner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assigned_cleaner_id_fkey" FOREIGN KEY ("assigned_cleaner_id") REFERENCES "cleaners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
