import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/onboarding");

  const prisma = getPrisma();
  let initialStep = 1;
  let firstPropertyId: string | null = null;
  let firstPropertyName: string | null = null;
  let firstCleanerId: string | null = null;
  let firstCleanerName: string | null = null;
  let telegramLinked = false;
  let ingestToken = "";

  try {
    const [user, properties, cleaners] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { telegram_chat_id: true, ingest_token: true },
      }),
      prisma.property.findMany({
        where: { landlord_id: session.user.id },
        orderBy: { created_at: "asc" },
        select: { id: true, name: true },
        take: 1,
      }),
      prisma.cleaner.findMany({
        where: { landlord_id: session.user.id },
        orderBy: { created_at: "asc" },
        select: { id: true, name: true },
        take: 1,
      }),
    ]);

    telegramLinked = !!user?.telegram_chat_id;
    ingestToken = user?.ingest_token ?? "";

    if (properties.length > 0) {
      firstPropertyId = properties[0].id;
      firstPropertyName = properties[0].name;
      initialStep = Math.max(initialStep, 2);
    }

    if (cleaners.length > 0) {
      firstCleanerId = cleaners[0].id;
      firstCleanerName = cleaners[0].name;
      initialStep = Math.max(initialStep, 3);
    }

    if (firstPropertyId && firstCleanerId) {
      const hasAssignment = await prisma.propertyCleaner.count({
        where: { property_id: firstPropertyId },
      });
      if (hasAssignment > 0) initialStep = Math.max(initialStep, 4);
    }

    if (telegramLinked) initialStep = Math.max(initialStep, 5);

    // All required steps done — redirect to dashboard
    if (initialStep >= 5 && telegramLinked) {
      redirect("/dashboard");
    }
  } finally {
    await prisma.$disconnect();
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
  const ingestCentralEmail = process.env.INGEST_CENTRAL_EMAIL ?? "";

  return (
    <OnboardingWizard
      initialStep={initialStep}
      userId={session.user.id}
      botUsername={botUsername}
      ingestCentralEmail={ingestCentralEmail}
      ingestToken={ingestToken}
      firstPropertyId={firstPropertyId}
      firstPropertyName={firstPropertyName}
      firstCleanerId={firstCleanerId}
      firstCleanerName={firstCleanerName}
      telegramLinked={telegramLinked}
    />
  );
}
