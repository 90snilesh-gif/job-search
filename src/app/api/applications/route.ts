import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, jobs } from "@/db/schema";
import { applicationCreateSchema } from "@/lib/validation";
import { getActiveApplicationsWithJobs } from "@/lib/applications";

export const dynamic = "force-dynamic";

// GET /api/applications — active (non-archived) applications joined with their
// jobs, newest first. Returns the same shape the dashboard renders so the
// client can fully re-sync after a mutation.
export async function GET() {
  const rows = await getActiveApplicationsWithJobs();
  return NextResponse.json({ applications: rows });
}

/**
 * POST /api/applications — quick-add an application.
 *
 * Two modes (validated by the schema): link an existing `jobId`, or pass
 * inline `company` + `roleTitle` and we create the linked job in one step so
 * "quick add" stays low-friction. Job + application are created together.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = applicationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  let jobId = d.jobId;

  // Create the job inline when no existing one was linked.
  if (!jobId) {
    const [job] = await db
      .insert(jobs)
      .values({
        company: d.company!,
        roleTitle: d.roleTitle!,
        jdUrl: d.jdUrl ?? null,
        location: d.location ?? null,
        source: "manual",
        // If we're already applying, reflect that on the job's triage status.
        status: d.status === "saved" ? "new" : "applied",
      })
      .returning();
    jobId = job.id;
  }

  const [created] = await db
    .insert(applications)
    .values({
      jobId,
      status: d.status,
      dateApplied: d.dateApplied ?? null,
      resumeVersion: d.resumeVersion ?? null,
      coverLetterVersion: d.coverLetterVersion ?? null,
      nextAction: d.nextAction ?? null,
      nextActionDate: d.nextActionDate ?? null,
      notes: d.notes ?? null,
      lastUpdated: new Date(),
    })
    .returning();

  return NextResponse.json({ application: created }, { status: 201 });
}
