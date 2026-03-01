import { auth } from "@/auth";
import { redirect } from "next/navigation";

/** All job assignment is done from Dispatch. Redirect so one place only. */
export default async function JobsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect("/dashboard/cleanings");
}
