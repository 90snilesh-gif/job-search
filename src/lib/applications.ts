import { db } from "@/db";
import { applications, jobs, type Application, type Job } from "@/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import type { ApplicationWithJob } from "@/lib/stats";

// Re-export the pure helpers so existing imports from "@/lib/applications"
// keep working. New client code should import these from "@/lib/stats".
export {
  computeStats,
  isStale,
  type ApplicationWithJob,
  type DashboardStats,
} from "@/lib/stats";

/** Load active (non-archived) applications with their linked job fields. */
export async function getActiveApplicationsWithJobs(): Promise<
  ApplicationWithJob[]
> {
  const rows = await db
    .select({ app: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(isNull(applications.archivedAt))
    .orderBy(desc(applications.lastUpdated));

  return rows.map(({ app, job }: { app: Application; job: Job }) => ({
    ...app,
    company: job.company,
    roleTitle: job.roleTitle,
    jobLocation: job.location,
    jdUrl: job.jdUrl,
    fitScore: job.fitScore,
  }));
}
