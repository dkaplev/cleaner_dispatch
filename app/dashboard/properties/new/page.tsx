import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "../../dashboard-header";
import { PropertyForm } from "../property-form";

export default async function NewPropertyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8 max-w-lg">
        <h2 className="text-lg font-semibold text-zinc-900">Add property</h2>
        <PropertyForm action="create" />
      </main>
    </div>
  );
}
