-- CreateTable
CREATE TABLE "cleanings" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "cleaner_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleanings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cleanings" ADD CONSTRAINT "cleanings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleanings" ADD CONSTRAINT "cleanings_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "cleaners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
