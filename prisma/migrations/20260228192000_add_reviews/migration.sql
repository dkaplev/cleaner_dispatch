-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "cleaner_id" TEXT NOT NULL,
    "rating_1_5" INTEGER NOT NULL,
    "tags_json" TEXT,
    "comment_optional" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_job_id_key" ON "reviews"("job_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "cleaners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
