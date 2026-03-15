import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { dispatchJob, getResponseMinutes } from "@/lib/dispatch";
import { notifyLandlordJobTimedOut } from "@/lib/notify-landlord-telegram";

/**
 * Cron endpoint: mark timed-out offers (no response within RESPONSE_MINUTES) and route job to next cleaner.
 * For each timed-out job, notifies the landlord whether a fallback was found or manual intervention is needed.
 * Call periodically via Vercel Cron or external cron.
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
    // Fetch timed-out attempts with enough context to notify the landlord
    const timedOut = await prisma.dispatchAttempt.findMany({
      where: {
        offer_status: "sent",
        offer_sent_at: { lt: cutoff },
      },
      select: {
        id: true,
        job_id: true,
        cleaner: { select: { name: true } },
        job: {
          select: {
            id: true,
            property: { select: { name: true } },
            landlord: { select: { telegram_chat_id: true } },
          },
        },
      },
    });

    if (timedOut.length === 0) {
      return NextResponse.json({ ok: true, timed_out: 0, dispatched: 0 });
    }

    // Mark all timed-out attempts in one query
    await prisma.dispatchAttempt.updateMany({
      where: { id: { in: timedOut.map((a) => a.id) } },
      data: { offer_status: "timeout" },
    });

    // Process each affected job: try next cleaner, then notify landlord
    const jobIds = [...new Set(timedOut.map((a) => a.job_id))];
    let dispatched = 0;

    for (const jobId of jobIds) {
      // Build context from the first timed-out attempt for this job
      const context = timedOut.find((a) => a.job_id === jobId);
      const timedOutCleanerName = context?.cleaner.name ?? "Cleaner";
      const propertyName = context?.job.property.name ?? "";
      const landlordChatId = context?.job.landlord?.telegram_chat_id ?? null;

      // Try to offer job to the next eligible cleaner
      const result = await dispatchJob(prisma, jobId);

      // Notify landlord regardless of whether a fallback was found
      if (landlordChatId?.trim()) {
        try {
          await notifyLandlordJobTimedOut(
            landlordChatId,
            propertyName,
            timedOutCleanerName,
            jobId,
            result.success ? result.attempt.cleaner_name : undefined
          );
        } catch (e) {
          console.error("[cron dispatch-timeout] Failed to notify landlord for job", jobId, e);
        }
      }

      if (result.success) {
        dispatched += 1;
      } else {
        console.warn("[cron dispatch-timeout] No fallback cleaner for job", jobId, result.error);
      }
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
