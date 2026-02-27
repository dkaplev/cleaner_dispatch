import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { dispatchJob, getResponseMinutes } from "@/lib/dispatch";

/**
 * Cron endpoint: mark timed-out offers (no response within RESPONSE_MINUTES) and route job to next cleaner.
 * Call periodically via Vercel Cron or external cron. Vercel Hobby allows only daily (e.g. 08:00 UTC); for more frequent runs use an external cron or Pro.
 * Requires CRON_SECRET: send Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.
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

  const prisma = getPrisma();
  const responseMinutes = getResponseMinutes();
  const cutoff = new Date(Date.now() - responseMinutes * 60 * 1000);

  try {
    const timedOut = await prisma.dispatchAttempt.findMany({
      where: {
        offer_status: "sent",
        offer_sent_at: { lt: cutoff },
      },
      select: { id: true, job_id: true },
    });

    if (timedOut.length === 0) {
      return NextResponse.json({ ok: true, timed_out: 0, dispatched: 0 });
    }

    await prisma.dispatchAttempt.updateMany({
      where: { id: { in: timedOut.map((a) => a.id) } },
      data: { offer_status: "timeout" },
    });

    const jobIds = [...new Set(timedOut.map((a) => a.job_id))];
    let dispatched = 0;
    for (const jobId of jobIds) {
      const result = await dispatchJob(prisma, jobId);
      if (result.success) dispatched += 1;
    }

    return NextResponse.json({
      ok: true,
      timed_out: timedOut.length,
      jobs_checked: jobIds.length,
      dispatched,
    });
  } catch (error) {
    console.error("[cron dispatch-timeout] Error:", error);
    return NextResponse.json(
      { error: "Failed to process timeouts" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
