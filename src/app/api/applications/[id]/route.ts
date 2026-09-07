import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { applicationUpdateSchema } from "@/lib/validation";
import { todayDateString } from "@/lib/date";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/applications/:id — update editable fields (including status moves
 * from the kanban board). Only provided fields are changed.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = applicationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Look up the current row first so we can auto-stamp dateApplied without
  // clobbering one the user already set.
  const [existing] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, params.id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build a patch of only the keys that were actually provided.
  const patch: Record<string, unknown> = { lastUpdated: new Date() };
  if (d.status !== undefined) patch.status = d.status;
  if (d.dateApplied !== undefined) patch.dateApplied = d.dateApplied ?? null;
  if (d.resumeVersion !== undefined)
    patch.resumeVersion = d.resumeVersion ?? null;
  if (d.coverLetterVersion !== undefined)
    patch.coverLetterVersion = d.coverLetterVersion ?? null;
  if (d.nextAction !== undefined) patch.nextAction = d.nextAction ?? null;
  if (d.nextActionDate !== undefined)
    patch.nextActionDate = d.nextActionDate ?? null;
  if (d.notes !== undefined) patch.notes = d.notes ?? null;

  // Auto-stamp dateApplied the first time status moves past "saved", so the
  // user never has to pick a date by hand. Only fires when no date was
  // explicitly provided in this request and none is already on record.
  if (
    d.status !== undefined &&
    d.status !== "saved" &&
    d.dateApplied === undefined &&
    !existing.dateApplied
  ) {
    patch.dateApplied = todayDateString();
  }

  const [updated] = await db
    .update(applications)
    .set(patch)
    .where(eq(applications.id, params.id))
    .returning();

  return NextResponse.json({ application: updated });
}

/**
 * DELETE /api/applications/:id — soft archive (never destructive). The row is
 * kept with `archivedAt` set so history and stats remain intact.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const [archived] = await db
    .update(applications)
    .set({ archivedAt: new Date(), lastUpdated: new Date() })
    .where(eq(applications.id, params.id))
    .returning();

  if (!archived) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ application: archived });
}
