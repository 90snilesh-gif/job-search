import { describe, it, expect } from "vitest";
import { computeStats, isStale, type ApplicationWithJob } from "@/lib/stats";

// Build a test application row with sensible defaults.
function app(partial: Partial<ApplicationWithJob>): ApplicationWithJob {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    jobId: crypto.randomUUID(),
    status: "saved",
    dateApplied: null,
    resumeVersion: null,
    coverLetterVersion: null,
    nextAction: null,
    nextActionDate: null,
    notes: null,
    archivedAt: null,
    lastUpdated: now,
    createdAt: now,
    company: "Acme",
    roleTitle: "Engineer",
    jobLocation: null,
    jdUrl: null,
    fitScore: null,
    ...partial,
  } as ApplicationWithJob;
}

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const dateDaysAgo = (n: number) => daysAgo(n).toISOString().slice(0, 10);

describe("computeStats", () => {
  it("counts applications applied within the last 7 days", () => {
    const apps = [
      app({ status: "applied", dateApplied: dateDaysAgo(2) }),
      app({ status: "applied", dateApplied: dateDaysAgo(10) }),
    ];
    expect(computeStats(apps).appliedThisWeek).toBe(1);
  });

  it("flags awaiting-response items older than 7 days as stale", () => {
    const apps = [
      app({ status: "applied", lastUpdated: daysAgo(9) }), // stale
      app({ status: "applied", lastUpdated: daysAgo(3) }), // fresh
      app({ status: "interview", lastUpdated: daysAgo(20) }), // not "awaiting"
    ];
    expect(computeStats(apps).staleAwaiting).toBe(1);
  });

  it("counts phone_screen and interview as interviewing", () => {
    const apps = [
      app({ status: "phone_screen" }),
      app({ status: "interview" }),
      app({ status: "applied" }),
    ];
    expect(computeStats(apps).interviewing).toBe(2);
  });

  it("excludes terminal statuses from the active pipeline", () => {
    const apps = [
      app({ status: "saved" }),
      app({ status: "applied" }),
      app({ status: "rejected" }),
      app({ status: "withdrawn" }),
    ];
    expect(computeStats(apps).activePipeline).toBe(2);
  });
});

describe("isStale", () => {
  it("is true for an applied item untouched for 8 days", () => {
    expect(isStale(app({ status: "applied", lastUpdated: daysAgo(8) }))).toBe(
      true
    );
  });
  it("is false for a saved item (not awaiting a reply)", () => {
    expect(isStale(app({ status: "saved", lastUpdated: daysAgo(30) }))).toBe(
      false
    );
  });
});
