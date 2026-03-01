import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { deleteStoredPhoto } from "@/lib/upload-storage";

const DEFAULT_RETENTION_DAYS = 90;

function getRetentionDays(): number {
  const v = process.env.RETENTION_DAYS;
  if (v === undefined || v === "") return DEFAULT_RETENTION_DAYS;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
}

/**
 * Cron endpoint: delete stored photo files and JobMedia rows for completed jobs
 * whose review was created more than RETENTION_DAYS ago (default 90).
 * Reduces storage use over time.
 * Requires CRON_SECRET: Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = new URL(request.url).searchParams.get("secret");
  if (bearer !== cronSecret && querySecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retentionDays = getRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const prisma = getPrisma();
  try {
    const mediaToRemove = await prisma.jobMedia.findMany({
      where: {
        job: {
          status: "completed",
          review: { created_at: { lt: cutoff } },
        },
      },
      select: { id: true, photo_url: true },
    });

    for (const m of mediaToRemove) {
      await deleteStoredPhoto(m.photo_url);
    }

    if (mediaToRemove.length > 0) {
      await prisma.jobMedia.deleteMany({
        where: { id: { in: mediaToRemove.map((m) => m.id) } },
      });
    }

    return NextResponse.json({
      ok: true,
      retention_days: retentionDays,
      cutoff: cutoff.toISOString(),
      removed: mediaToRemove.length,
    });
  } catch (error) {
    console.error("[cron cleanup-old-media] Error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup old media" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
