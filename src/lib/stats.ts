import type { Application } from "@/db/schema";

/**
 * Pure, DB-free stat logic so it can run on both server and client. (The db
 * module must never be imported into a client component — it pulls in the
 * postgres driver.) Keep this file free of any `@/db` import.
 */

/** An application row with its linked job fields flattened in for display. */
export type ApplicationWithJob = Application & {
  company: string;
  roleTitle: string;
  jobLocation: string | null;
  jdUrl: string | null;
  fitScore: number | null;
};

export type DashboardStats = {
  appliedThisWeek: number;
  staleAwaiting: number; // awaiting a response for > 7 days
  interviewing: number;
  activePipeline: number;
};

const DAY = 24 * 60 * 60 * 1000;
const TERMINAL = new Set(["rejected", "withdrawn"]);
const AWAITING = new Set(["applied", "phone_screen"]);
const INTERVIEW = new Set(["phone_screen", "interview"]);

/**
 * Compute header stats from already-loaded rows (single-user scale, so no
 * aggregate queries needed).
 *
 * - appliedThisWeek: date_applied within the last 7 days.
 * - staleAwaiting: awaiting a reply (applied/phone_screen) with no update in
 *   7+ days — the ones to nudge.
 * - interviewing: currently in a phone screen or interview stage.
 * - activePipeline: not archived and not in a terminal state.
 */
export function computeStats(apps: ApplicationWithJob[]): DashboardStats {
  const now = Date.now();
  let appliedThisWeek = 0;
  let staleAwaiting = 0;
  let interviewing = 0;
  let activePipeline = 0;

  for (const a of apps) {
    if (!TERMINAL.has(a.status)) activePipeline += 1;
    if (INTERVIEW.has(a.status)) interviewing += 1;

    if (a.dateApplied) {
      const applied = new Date(a.dateApplied).getTime();
      if (now - applied <= 7 * DAY) appliedThisWeek += 1;
    }

    if (
      AWAITING.has(a.status) &&
      now - new Date(a.lastUpdated).getTime() > 7 * DAY
    ) {
      staleAwaiting += 1;
    }
  }

  return { appliedThisWeek, staleAwaiting, interviewing, activePipeline };
}

/** True when this application has been waiting for a reply for over 7 days. */
export function isStale(a: ApplicationWithJob): boolean {
  return (
    AWAITING.has(a.status) &&
    Date.now() - new Date(a.lastUpdated).getTime() > 7 * DAY
  );
}
