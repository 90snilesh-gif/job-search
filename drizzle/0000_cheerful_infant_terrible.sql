CREATE TYPE "public"."application_status" AS ENUM('saved', 'applied', 'phone_screen', 'interview', 'offer', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."ats_platform" AS ENUM('greenhouse', 'lever', 'ashby', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."contact_relationship" AS ENUM('1st_degree', '2nd_degree', 'cold', 'referred_by');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('to_contact', 'messaged', 'replied', 'referred', 'declined');--> statement-breakpoint
CREATE TYPE "public"."job_source" AS ENUM('manual', 'gmail_alert', 'ats_api', 'hn');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('new', 'reviewing', 'discarded', 'applied');--> statement-breakpoint
CREATE TYPE "public"."target_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'saved' NOT NULL,
	"date_applied" date,
	"resume_version" text,
	"cover_letter_version" text,
	"next_action" text,
	"next_action_date" date,
	"notes" text,
	"archived_at" timestamp with time zone,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"why_interested" text,
	"ats_platform" "ats_platform" DEFAULT 'unknown' NOT NULL,
	"ats_slug" text,
	"target_priority" "target_priority" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"role_title" text,
	"linkedin_url" text,
	"email" text,
	"relationship" "contact_relationship" DEFAULT 'cold' NOT NULL,
	"status" "contact_status" DEFAULT 'to_contact' NOT NULL,
	"last_touchpoint_date" date,
	"follow_up_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"role_title" text NOT NULL,
	"jd_text" text,
	"jd_url" text,
	"source" "job_source" DEFAULT 'manual' NOT NULL,
	"location" text,
	"remote_type" text,
	"salary_range" text,
	"date_found" timestamp with time zone DEFAULT now() NOT NULL,
	"fit_score" integer,
	"fit_notes" text,
	"fit_input_hash" text,
	"status" "job_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_role_titles" text[] DEFAULT '{}' NOT NULL,
	"location" text[] DEFAULT '{}' NOT NULL,
	"work_experience" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resume_text" text,
	"sample_jds" text[] DEFAULT '{}' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
