import { redirect } from "next/navigation";
import { getProfile, isOnboardingComplete } from "@/lib/profile";
import { getActiveApplicationsWithJobs } from "@/lib/applications";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }

  const apps = await getActiveApplicationsWithJobs();

  return <DashboardClient initialApps={apps} />;
}
