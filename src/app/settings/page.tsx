import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getProfile();
  // No profile yet → onboarding owns profile creation.
  if (!profile) {
    redirect("/onboarding");
  }
  return <SettingsForm profile={profile} />;
}
