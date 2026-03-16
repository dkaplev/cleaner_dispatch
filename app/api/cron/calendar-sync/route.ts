import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { syncAllCalendarFeeds } from "@/lib/calendar-sync";

/** Hourly cron: sync all calendar feeds. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get("authorization") ?? "";
  const query  = new URL(req.url).searchParams.get("secret") ?? "";
  if (secret && auth !== `Bearer ${secret}` && query !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  try {
    const results = await syncAllCalendarFeeds(prisma);
    const summary = {
      feeds:     results.length,
      created:   results.reduce((a, r) => a + r.created,   0),
      updated:   results.reduce((a, r) => a + r.updated,   0),
      cancelled: results.reduce((a, r) => a + r.cancelled, 0),
      errors:    results.filter((r) => r.error).length,
    };
    console.log("[cron/calendar-sync]", summary, results);
    return NextResponse.json({ ok: true, ...summary });
  } finally {
    await prisma.$disconnect();
  }
}
