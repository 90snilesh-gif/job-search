import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * Database schema for the personal job-search dashboard.
 *
 * Design note: this schema is deliberately ROLE-AGNOSTIC. Nothing here encodes
 * a specific field, seniority, or industry. Everything the app personalizes
 * (fit scoring, source suggestions, dashboard copy) reads from the single
 * `profile` row at runtime — see `profile.targetRoleTitles` etc. Do not add
 * role/field defaults or hardcoded assumptions to any table.
 */

/* ------------------------------------------------------------------ enums */

// jobs.source — where a job lead came from.
export const jobSourceEnum = pgEnum("job_source", [
  "manual",
  "gmail_alert",
  "ats_api",
  "hn",
]);

// jobs.status — triage state of a raw lead (distinct from application status).
export const jobStatusEnum = pgEnum("job_status", [
  "new",
  "reviewing",
  "discarded",
  "applied",
]);

// applications.status — the pipeline the user actively works.
export const applicationStatusEnum = pgEnum("application_status", [
  "saved",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]);

// contacts.relationship — how the user knows this person.
export const contactRelationshipEnum = pgEnum("contact_relationship", [
  "1st_degree",
  "2nd_degree",
  "cold",
  "referred_by",
]);

// contacts.status — outreach pipeline.
export const contactStatusEnum = pgEnum("contact_status", [
  "to_contact",
  "messaged",
  "replied",
  "referred",
  "declined",
]);

// companies.ats_platform — which public ATS board API to poll (Phase 2).
export const atsPlatformEnum = pgEnum("ats_platform", [
  "greenhouse",
  "lever",
  "ashby",
  "other",
  "unknown",
]);

// companies.target_priority
export const targetPriorityEnum = pgEnum("target_priority", [
  "high",
  "medium",
  "low",
]);

/* ---------------------------------------------------------------- profile */

/**
 * Single-row table (enforced in app logic) that drives all personalization.
 *
 * Mandatory during onboarding: targetRoleTitles, location, workExperience.
 * Skippable (fill later from settings): resumeText, sampleJds.
 * `onboardingCompletedAt` is set only once the three mandatory fields exist.
 */
export const profile = pgTable("profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Array of role titles the user is targeting, e.g. ["Backend Engineer", "Platform Engineer"].
  targetRoleTitles: text("target_role_titles").array().notNull().default([]),
  // Cities and/or remote preference, e.g. ["Bengaluru", "Remote (India)"].
  location: text("location").array().notNull().default([]),
  // Structured work history: array of { title, company, years, summary? }.
  // Stored as JSONB so the shape can evolve without a migration.
  workExperience: jsonb("work_experience").notNull().default([]),
  // Skippable — strongest signal for fit scoring when present.
  resumeText: text("resume_text"),
  // Skippable — array of pasted JD texts the user is targeting.
  sampleJds: text("sample_jds").array().notNull().default([]),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------- jobs */

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  company: text("company").notNull(),
  roleTitle: text("role_title").notNull(),
  jdText: text("jd_text"),
  jdUrl: text("jd_url"),
  source: jobSourceEnum("source").notNull().default("manual"),
  location: text("location"),
  remoteType: text("remote_type"), // free text: onsite / hybrid / remote / etc.
  salaryRange: text("salary_range"),
  dateFound: timestamp("date_found", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Fit scoring (Phase 2) — nullable until scored. 1-10.
  fitScore: integer("fit_score"),
  fitNotes: text("fit_notes"),
  // Hash of the profile+job inputs used to compute the cached fit score, so we
  // can skip recompute when nothing changed (cost control, Phase 2).
  fitInputHash: text("fit_input_hash"),
  status: jobStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ----------------------------------------------------------- applications */

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  status: applicationStatusEnum("status").notNull().default("saved"),
  dateApplied: date("date_applied"),
  resumeVersion: text("resume_version"),
  coverLetterVersion: text("cover_letter_version"),
  // The single most important field for keeping the search alive.
  nextAction: text("next_action"),
  nextActionDate: date("next_action_date"),
  notes: text("notes"),
  // Soft-archive so nothing is destructively deleted.
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  lastUpdated: timestamp("last_updated", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* --------------------------------------------------------------- contacts */

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  roleTitle: text("role_title"),
  linkedinUrl: text("linkedin_url"),
  email: text("email"),
  relationship: contactRelationshipEnum("relationship")
    .notNull()
    .default("cold"),
  status: contactStatusEnum("status").notNull().default("to_contact"),
  lastTouchpointDate: date("last_touchpoint_date"),
  followUpDate: date("follow_up_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------- companies */

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  whyInterested: text("why_interested"),
  atsPlatform: atsPlatformEnum("ats_platform").notNull().default("unknown"),
  atsSlug: text("ats_slug"), // used for public ATS board polling in Phase 2
  targetPriority: targetPriorityEnum("target_priority")
    .notNull()
    .default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------- inferred TS types */

export type Profile = typeof profile.$inferSelect;
export type NewProfile = typeof profile.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

// Shape of one entry inside profile.workExperience (JSONB array).
export type WorkExperienceEntry = {
  title: string;
  company: string;
  years?: string;
  summary?: string;
};
