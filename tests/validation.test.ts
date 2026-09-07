import { describe, it, expect } from "vitest";
import {
  profileSchema,
  applicationCreateSchema,
  contactSchema,
} from "@/lib/validation";

describe("profileSchema — onboarding mandatory/skippable contract", () => {
  const validBase = {
    targetRoleTitles: ["Backend Engineer"],
    location: ["Bengaluru"],
    workExperience: [{ title: "SWE", company: "Acme" }],
  };

  it("accepts the three mandatory fields with skippables omitted", () => {
    const r = profileSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });

  it("rejects when target roles are empty", () => {
    const r = profileSchema.safeParse({ ...validBase, targetRoleTitles: [] });
    expect(r.success).toBe(false);
  });

  it("rejects when location is empty", () => {
    const r = profileSchema.safeParse({ ...validBase, location: [] });
    expect(r.success).toBe(false);
  });

  it("rejects when work experience is empty", () => {
    const r = profileSchema.safeParse({ ...validBase, workExperience: [] });
    expect(r.success).toBe(false);
  });

  it("rejects a work experience entry missing a company", () => {
    const r = profileSchema.safeParse({
      ...validBase,
      workExperience: [{ title: "SWE", company: "" }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts optional resume + sample JDs when present", () => {
    const r = profileSchema.safeParse({
      ...validBase,
      resumeText: "Ten years of ...",
      sampleJds: ["We are hiring a ..."],
    });
    expect(r.success).toBe(true);
  });
});

describe("applicationCreateSchema — quick add", () => {
  it("accepts an existing jobId", () => {
    const r = applicationCreateSchema.safeParse({
      jobId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    });
    expect(r.success).toBe(true);
  });

  it("accepts inline company + role (creates the job)", () => {
    const r = applicationCreateSchema.safeParse({
      company: "Acme",
      roleTitle: "Platform Engineer",
    });
    expect(r.success).toBe(true);
  });

  it("rejects when neither jobId nor company+role is provided", () => {
    const r = applicationCreateSchema.safeParse({ notes: "just a note" });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid JD URL", () => {
    const r = applicationCreateSchema.safeParse({
      company: "Acme",
      roleTitle: "SWE",
      jdUrl: "not-a-url",
    });
    expect(r.success).toBe(false);
  });
});

describe("contactSchema", () => {
  it("requires a name", () => {
    const r = contactSchema.safeParse({ company: "Acme" });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const r = contactSchema.safeParse({ name: "Jo", email: "nope" });
    expect(r.success).toBe(false);
  });

  it("accepts a minimal valid contact", () => {
    const r = contactSchema.safeParse({ name: "Jo" });
    expect(r.success).toBe(true);
  });
});
