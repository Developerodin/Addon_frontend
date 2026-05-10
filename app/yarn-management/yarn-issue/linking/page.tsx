import { redirect } from "next/navigation";

/**
 * Legacy URL — linking + sampling share one screen.
 */
export default function YarnIssueLinkingRedirectPage() {
  redirect("/yarn-management/yarn-issue/linking-sampling?tab=linking");
}
