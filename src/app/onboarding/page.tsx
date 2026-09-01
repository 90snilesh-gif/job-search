import { redirect } from "next/navigation";
import { getProfile, isOnboardingComplete } from "@/lib/profile";
import OnboardingWizard from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await getProfile();
  // If onboarding is already done, don't show the wizard again — go to app.
  if (isOnboardingComplete(profile)) {
    redirect("/dashboard");
  }
  return <OnboardingWizard initial={profile} />;
}
