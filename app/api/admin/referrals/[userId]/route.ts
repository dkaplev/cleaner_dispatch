import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import { createCleanerPortalToken } from "@/lib/cleaner-token";
import { sendTelegramMessageWithUrlButton, sendTelegramMessage } from "@/lib/telegram";

/** POST /api/admin/referrals/[userId]/approve — approve the €20 payout for a referred landlord. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  await requireAdmin();
  const { userId } = await params;

  const prisma = getPrisma();
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        referred_by_cleaner_id: true,
        referral_paid_at: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.referred_by_cleaner_id)
      return NextResponse.json({ error: "This user was not referred" }, { status: 400 });
    if (user.referral_paid_at)
      return NextResponse.json({ error: "Payout already approved" }, { status: 409 });

    // Mark payout as approved
    await prisma.user.update({
      where: { id: userId },
      data: { referral_paid_at: new Date() },
    });

    // Notify the referring cleaner via Telegram
    const cleaner = await prisma.cleaner.findUnique({
      where: { id: user.referred_by_cleaner_id },
      select: { id: true, name: true, telegram_chat_id: true },
    });

    if (cleaner?.telegram_chat_id) {
      const firstName = cleaner.name.split(" ")[0];
      const baseUrl   = process.env.NEXTAUTH_URL ?? "https://cleaner-dispatch.vercel.app";
      const token     = createCleanerPortalToken(cleaner.id);
      const portalUrl = `${baseUrl}/cleaner/portal?token=${encodeURIComponent(token)}`;

      const text =
        `💰 <b>Your €20 referral payout is approved, ${firstName}!</b>\n\n` +
        `The landlord you referred (${user.email}) has started their paid subscription.\n\n` +
        `<b>Reply to this message</b> with your preferred time and location in Cyprus (Nicosia or Limassol) and we'll arrange your cash payout. 🤝`;

      try {
        await sendTelegramMessageWithUrlButton(cleaner.telegram_chat_id, text, "📊 My portal", portalUrl);
      } catch {
        await sendTelegramMessage(cleaner.telegram_chat_id, text);
      }
    }

    return NextResponse.json({ ok: true });
  } finally {
    await prisma.$disconnect();
  }
}
