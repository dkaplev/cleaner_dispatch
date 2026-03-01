import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyUploadToken } from "@/lib/upload-token";
import { saveJobPhoto } from "@/lib/upload-storage";
import { compressJobPhoto } from "@/lib/compress-image";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * POST /api/job-upload?token=...
 * Body: multipart/form-data with file(s). Field name: "photos" or "photo".
 * Token must be valid (signed, not expired) and job must be assigned to that cleaner.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token?.trim()) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const payload = verifyUploadToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { jobId, cleanerId } = payload;
  let prisma;
  try {
    prisma = getPrisma();
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, assigned_cleaner_id: true, status: true },
    });
    if (!job || job.assigned_cleaner_id !== cleanerId) {
      return NextResponse.json({ error: "Job not found or not assigned to you" }, { status: 404 });
    }
    const allowedStatuses = ["accepted", "in_progress"];
    if (!allowedStatuses.includes(job.status)) {
      return NextResponse.json(
        { error: "This job is not in a state that allows photo uploads" },
        { status: 400 }
      );
    }
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const files: { buffer: Buffer; ext: string }[] = [];
  const allEntries = formData.getAll("photos").length ? formData.getAll("photos") : formData.getAll("photo").length ? formData.getAll("photo") : [formData.get("photo"), formData.get("photos")].filter(Boolean);
  for (const entry of allEntries) {
    if (!(entry instanceof File)) continue;
    if (!ALLOWED_TYPES.includes(entry.type)) continue;
    if (entry.size > MAX_FILE_SIZE) continue;
    const buf = Buffer.from(await entry.arrayBuffer());
    const nameExt = entry.name.split(".").pop()?.toLowerCase() || "jpg";
    // Compress for storage (resize + JPEG quality); fall back to original if compression fails
    const compressed = await compressJobPhoto(buf, entry.type);
    const { buffer, ext } = compressed ?? { buffer: buf, ext: nameExt };
    files.push({ buffer, ext });
  }
  const uniqueFiles = files;

  if (uniqueFiles.length === 0) {
    return NextResponse.json({ error: "No valid photo file(s) (allowed: jpeg, png, webp, gif; max 10MB each)" }, { status: 400 });
  }

  prisma = getPrisma();
  const saved: { id: string; photo_url: string }[] = [];
  try {
    for (const file of uniqueFiles) {
      const relativePath = await saveJobPhoto(file.buffer, jobId, file.ext);
      const row = await prisma.jobMedia.create({
        data: { job_id: jobId, cleaner_id: cleanerId, photo_url: relativePath },
        select: { id: true, photo_url: true },
      });
      saved.push(row);
    }
    return NextResponse.json({ ok: true, uploaded: saved.length, media: saved });
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: string };
    console.error("[job-upload] Error:", e);
    const isReadOnly = e?.code === "EROFS" || /read-only|EACCES|EPERM/i.test(String(e?.message ?? ""));
    const message = isReadOnly
      ? "Photo storage not configured. Add BLOB_READ_WRITE_TOKEN in Vercel project settings (Storage → Blob)."
      : "Failed to save photos. Try again or use a smaller image.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
