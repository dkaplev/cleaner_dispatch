import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "../../dashboard-header";
import { JobForm } from "../job-form";

export default async function NewJobPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let properties: { id: string; name: string }[] = [];
  let prisma;
  try {
    prisma = getPrisma();
    properties = await prisma.property.findMany({
      where: { landlord_id: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8 max-w-lg">
        <h2 className="text-lg font-semibold text-zinc-900">Create job</h2>
        <JobForm properties={properties} />
      </main>
    </div>
  );
}
