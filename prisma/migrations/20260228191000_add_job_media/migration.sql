-- CreateTable
CREATE TABLE "job_media" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "cleaner_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_media_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "job_media" ADD CONSTRAINT "job_media_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_media" ADD CONSTRAINT "job_media_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "cleaners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
