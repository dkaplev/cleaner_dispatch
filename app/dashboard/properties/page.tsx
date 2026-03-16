import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardHeader } from "../dashboard-header";
import { PropertyList } from "./property-list";

export default async function PropertiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let properties: {
    id: string;
    name: string;
    address: string | null;
    cleaning_duration_minutes: number | null;
    cleaning_trigger: string;
    cleaner_count: number;
    feed_count: number;
  }[] = [];

  let prisma;
  try {
    prisma = getPrisma();
    const raw = await prisma.property.findMany({
      where: { landlord_id: session.user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        address: true,
        cleaning_duration_minutes: true,
        cleaning_trigger: true,
        _count: { select: { property_cleaners: true, calendar_feeds: true } },
      },
    });
    properties = raw.map((p) => ({
      id:                       p.id,
      name:                     p.name,
      address:                  p.address,
      cleaning_duration_minutes: p.cleaning_duration_minutes,
      cleaning_trigger:         p.cleaning_trigger,
      cleaner_count:            p._count.property_cleaners,
      feed_count:               p._count.calendar_feeds,
    }));
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mx-auto max-w-5xl px-6 pb-16 pt-8">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#3c3732]">Properties</h1>
            <p className="mt-0.5 text-sm text-[#7d7570]">
              Manage your rental properties, assign cleaners and calendar feeds.
            </p>
          </div>
          <Link
            href="/dashboard/properties/new"
            className="rounded-full bg-[#3c3732] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2d2925] transition-colors"
          >
            + Add property
          </Link>
        </div>
        <PropertyList initialProperties={properties} />
        <p className="mt-6 text-sm">
          <Link href="/dashboard" className="text-[#7d7570] hover:text-[#3c3732] hover:underline">
            ← Dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
