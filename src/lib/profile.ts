import { db } from "@/db";
import { profile, type Profile } from "@/db/schema";
import { desc } from "drizzle-orm";

/**
 * The app is single-user, so `profile` holds at most one row. These helpers
 * centralize "get the one profile" and "is onboarding done" so no caller has
 * to re-implement that assumption.
 */

export async function getProfile(): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(profile)
    .orderBy(desc(profile.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export function isOnboardingComplete(p: Profile | null): boolean {
  return Boolean(
    p &&
      p.onboardingCompletedAt &&
      p.targetRoleTitles.length > 0 &&
      p.location.length > 0 &&
      Array.isArray(p.workExperience) &&
      (p.workExperience as unknown[]).length > 0
  );
}
