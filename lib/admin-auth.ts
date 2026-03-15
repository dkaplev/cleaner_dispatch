import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Server-side admin guard. Call at the top of every admin page/route.
 * Checks that the signed-in user's email matches ADMIN_EMAIL env var.
 * Non-admins are silently redirected to the dashboard.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/login");

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    // ADMIN_EMAIL not set — refuse access rather than silently allowing all
    redirect("/dashboard");
  }
  if (session.user.email.toLowerCase() !== adminEmail) {
    redirect("/dashboard");
  }
  return { id: session.user.id, email: session.user.email };
}
