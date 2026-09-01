import { z } from "zod";

/**
 * Input validation for all write paths. Every API route parses its body with
 * one of these before touching the DB, so malformed input is rejected at the
 * edge instead of silently corrupting rows.
 */

/* ------------------------------------------------------------ shared bits */

// Trim strings and treat "" as undefined so empty form fields don't persist
// as blank-but-present values.
const optionalText = z
  .string()
  .trim()
  .transform((s) => (s.length === 0 ? undefined : s))
  .optional();

const optionalUrl = z
  .string()
  .trim()
  .transform((s) => (s.length === 0 ? undefined : s))
  .refine((s) => s === undefined || /^https?:\/\/.+/i.test(s), {
    message: "Must be a valid http(s) URL",
  })
  .optional();

const optionalEmail = z
  .string()
  .trim()
  .transform((s) => (s.length === 0 ? undefined : s))
  .refine(
    (s) => s === undefined || z.string().email().safeParse(s).success,
    { message: "Must be a valid email" }
  )
  .optional();

// A date-only string (YYYY-MM-DD) or undefined.
const optionalDate = z
  .string()
  .trim()
  .transform((s) => (s.length === 0 ? undefined : s))
  .refine((s) => s === undefined || /^\d{4}-\d{2}-\d{2}$/.test(s), {
    message: "Must be a YYYY-MM-DD date",
  })
  .optional();

/* --------------------------------------------------------------- profile */

export const workExperienceEntrySchema = z.object({
  title: z.string().trim().min(1, "Role title is required"),
  company: z.string().trim().min(1, "Company is required"),
  years: z.string().trim().optional(),
  summary: z.string().trim().optional(),
});

/**
 * Profile write schema. Enforces the onboarding contract:
 *  - targetRoleTitles: mandatory, at least one non-empty
 *  - location: mandatory, at least one non-empty
 *  - workExperience: mandatory, at least one entry
 *  - resumeText, sampleJds: skippable
 */
export const profileSchema = z.object({
  targetRoleTitles: z
    .array(z.string().trim().min(1))
    .min(1, "Add at least one target role"),
  location: z
    .array(z.string().trim().min(1))
    .min(1, "Add at least one location or remote preference"),
  workExperience: z
    .array(workExperienceEntrySchema)
    .min(1, "Add at least one work experience entry"),
  resumeText: optionalText,
  sampleJds: z.array(z.string().trim().min(1)).optional().default([]),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/* ------------------------------------------------------------------ jobs */

export const jobSourceValues = ["manual", "gmail_alert", "ats_api", "hn"] as const;
export const jobStatusValues = [
  "new",
  "reviewing",
  "discarded",
  "applied",
] as const;

export const jobSchema = z.object({
  company: z.string().trim().min(1, "Company is required"),
  roleTitle: z.string().trim().min(1, "Role title is required"),
  jdText: optionalText,
  jdUrl: optionalUrl,
  source: z.enum(jobSourceValues).default("manual"),
  location: optionalText,
  remoteType: optionalText,
  salaryRange: optionalText,
  status: z.enum(jobStatusValues).default("new"),
});

export type JobInput = z.infer<typeof jobSchema>;

/* ---------------------------------------------------------- applications */

export const applicationStatusValues = [
  "saved",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

// Create an application. Either link an existing jobId, OR provide inline job
// fields (company + roleTitle) so "quick add" can create both in one step.
export const applicationCreateSchema = z
  .object({
    jobId: z.string().uuid().optional(),
    // Inline quick-add job fields (used when jobId is absent).
    company: optionalText,
    roleTitle: optionalText,
    jdUrl: optionalUrl,
    location: optionalText,
    status: z.enum(applicationStatusValues).default("saved"),
    dateApplied: optionalDate,
    resumeVersion: optionalText,
    coverLetterVersion: optionalText,
    nextAction: optionalText,
    nextActionDate: optionalDate,
    notes: optionalText,
  })
  .refine(
    (v) => Boolean(v.jobId) || (Boolean(v.company) && Boolean(v.roleTitle)),
    {
      message:
        "Provide an existing jobId, or a company and role title to create one",
      path: ["company"],
    }
  );

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;

// Partial update — any subset of editable fields.
export const applicationUpdateSchema = z.object({
  status: z.enum(applicationStatusValues).optional(),
  dateApplied: optionalDate,
  resumeVersion: optionalText,
  coverLetterVersion: optionalText,
  nextAction: optionalText,
  nextActionDate: optionalDate,
  notes: optionalText,
});

export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;

/* --------------------------------------------------------------- contacts */
// (Phase 3 — defined now so the shape is settled, used later.)

export const contactRelationshipValues = [
  "1st_degree",
  "2nd_degree",
  "cold",
  "referred_by",
] as const;
export const contactStatusValues = [
  "to_contact",
  "messaged",
  "replied",
  "referred",
  "declined",
] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  company: optionalText,
  roleTitle: optionalText,
  linkedinUrl: optionalUrl,
  email: optionalEmail,
  relationship: z.enum(contactRelationshipValues).default("cold"),
  status: z.enum(contactStatusValues).default("to_contact"),
  lastTouchpointDate: optionalDate,
  followUpDate: optionalDate,
  notes: optionalText,
});

export type ContactInput = z.infer<typeof contactSchema>;
