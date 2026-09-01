import { redirect } from "next/navigation";
import { getProfile, isOnboardingComplete } from "@/lib/profile";

// Root route: send the user to onboarding until the three mandatory profile
// fields exist, otherwise straight to the dashboard.
export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getProfile();
  if (!isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }
  redirect("/dashboard");
}
