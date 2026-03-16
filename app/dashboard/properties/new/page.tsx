import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "../../dashboard-header";
import { PropertySetupWizard } from "./property-setup-wizard";

export default async function NewPropertyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const prisma = getPrisma();
  let cleaners: { id: string; name: string; telegram_chat_id: string | null }[] = [];
  try {
    cleaners = await prisma.cleaner.findMany({
      where: { landlord_id: session.user.id, is_active: true },
      select: { id: true, name: true, telegram_chat_id: true },
      orderBy: { name: "asc" },
    });
  } finally {
    await prisma.$disconnect();
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec]">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mx-auto max-w-xl px-6 pb-16 pt-8">
        <PropertySetupWizard cleaners={cleaners} />
      </main>
    </div>
  );
}
