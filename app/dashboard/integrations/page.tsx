/**
 * Email ingestion integration page.
 *
 * Calendar sync is now the primary booking ingestion method.
 * The full email-forwarding UI has been preserved at:
 *   Instructions_planning/email-ingestion-page.tsx.bak
 *
 * Re-enable by restoring that file and removing the redirect below.
 */
import { redirect } from "next/navigation";

export default function IntegrationsPage() {
  redirect("/dashboard/properties");
}
