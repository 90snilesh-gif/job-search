import { NextResponse } from "next/server";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { profileSchema } from "@/lib/validation";
import { getProfile } from "@/lib/profile";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/profile — return the single profile row (or null).
export async function GET() {
  const p = await getProfile();
  return NextResponse.json({ profile: p });
}

/**
 * POST /api/profile — create or update the single profile row.
 *
 * Because the app is single-user, we upsert onto whatever row exists rather
 * than creating duplicates. Validation enforces the mandatory fields; once all
 * three are present we stamp `onboardingCompletedAt` so the app stops routing
 * to onboarding.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const existing = await getProfile();
  const now = new Date();

  const values = {
    targetRoleTitles: data.targetRoleTitles,
    location: data.location,
    workExperience: data.workExperience,
    resumeText: data.resumeText ?? null,
    sampleJds: data.sampleJds ?? [],
    // Mandatory fields are guaranteed present by validation, so onboarding is
    // complete as soon as this save succeeds.
    onboardingCompletedAt: existing?.onboardingCompletedAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    const [updated] = await db
      .update(profile)
      .set(values)
      .where(eq(profile.id, existing.id))
      .returning();
    return NextResponse.json({ profile: updated });
  }

  const [created] = await db.insert(profile).values(values).returning();
  return NextResponse.json({ profile: created }, { status: 201 });
}
