import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getPrisma } from "@/lib/prisma";
import { verifyUploadToken } from "@/lib/upload-token";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Client upload handler: generates Blob client tokens and creates JobMedia on completion.
 * Files go directly from the browser to Vercel Blob (avoids 4.5MB serverless body limit).
 * Client sends upload token via clientPayload; pathname must be jobs/{jobId}/...
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "Photo storage not configured. Add BLOB_READ_WRITE_TOKEN in Vercel." },
      { status: 503 }
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const token = (clientPayload ?? "").trim();
        if (!token) {
          throw new Error("Missing upload token");
        }
        const payload = verifyUploadToken(token);
        if (!payload) {
          throw new Error("Invalid or expired upload token");
        }
        const { jobId, cleanerId } = payload;
        const prefix = `jobs/${jobId}/`;
        if (!pathname.startsWith(prefix)) {
          throw new Error("Pathname must start with jobs/{jobId}/");
        }
        let prisma;
        try {
          prisma = getPrisma();
          const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { id: true, assigned_cleaner_id: true, status: true },
          });
          if (!job || job.assigned_cleaner_id !== cleanerId) {
            throw new Error("Job not found or not assigned to you");
          }
          const allowedStatuses = ["accepted", "in_progress"];
          if (!allowedStatuses.includes(job.status)) {
            throw new Error("This job does not allow photo uploads");
          }
        } finally {
          if (prisma) await prisma.$disconnect();
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ jobId, cleanerId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let data: { jobId?: string; cleanerId?: string };
        try {
          data = JSON.parse(tokenPayload ?? "{}") as { jobId?: string; cleanerId?: string };
        } catch {
          return;
        }
        const { jobId, cleanerId } = data;
        if (!jobId || !cleanerId) return;
        const prisma = getPrisma();
        try {
          await prisma.jobMedia.create({
            data: { job_id: jobId, cleaner_id: cleanerId, photo_url: blob.url },
          });
        } finally {
          await prisma.$disconnect();
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
