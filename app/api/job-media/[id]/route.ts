import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { isBlobUrl, resolvePhotoPath } from "@/lib/upload-storage";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * GET /api/job-media/[id]
 * Stream photo file. Landlord must be logged in and own the job.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let prisma;
  try {
    prisma = getPrisma();
    const media = await prisma.jobMedia.findUnique({
      where: { id },
      include: { job: { select: { landlord_id: true } } },
    });
    if (!media || media.job.landlord_id !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (isBlobUrl(media.photo_url)) {
      return NextResponse.redirect(media.photo_url, 302);
    }
    const absPath = resolvePhotoPath(media.photo_url);
    const buf = await readFile(absPath).catch(() => null);
    if (!buf) return NextResponse.json({ error: "File not found" }, { status: 404 });
    const ext = media.photo_url.split(".").pop()?.toLowerCase() || "jpg";
    const mime = MIME[ext] || "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
