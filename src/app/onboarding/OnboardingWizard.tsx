"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TagInput, WorkExperienceEditor } from "@/components/inputs";
import type { Profile, WorkExperienceEntry } from "@/db/schema";

/**
 * Guided, stepped onboarding — deliberately short (target < 3 minutes).
 *
 * Steps 1-3 are mandatory (roles, location, work experience) and gate
 * completion. Steps 4-5 (resume, sample JDs) are skippable and can be filled
 * later from Settings. The same underlying fields are editable afterwards, so
 * nothing captured here is permanent.
 */

type Props = { initial?: Profile | null };

const STEPS = [
  { key: "roles", title: "What roles are you targeting?", required: true },
  { key: "location", title: "Where do you want to work?", required: true },
  { key: "experience", title: "Your work experience", required: true },
  { key: "resume", title: "Resume (optional)", required: false },
  { key: "jds", title: "Sample job descriptions (optional)", required: false },
] as const;

export default function OnboardingWizard({ initial }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roles, setRoles] = useState<string[]>(initial?.targetRoleTitles ?? []);
  const [location, setLocation] = useState<string[]>(initial?.location ?? []);
  const [experience, setExperience] = useState<WorkExperienceEntry[]>(
    (initial?.workExperience as WorkExperienceEntry[]) ?? [
      { title: "", company: "", years: "", summary: "" },
    ]
  );
  const [resumeText, setResumeText] = useState(initial?.resumeText ?? "");
  const [sampleJds, setSampleJds] = useState<string[]>(initial?.sampleJds ?? []);
  const [jdDraft, setJdDraft] = useState("");

  // Per-step validity — mandatory steps must have real content.
  function stepValid(index: number): boolean {
    switch (STEPS[index].key) {
      case "roles":
        return roles.length > 0;
      case "location":
        return location.length > 0;
      case "experience":
        return experience.some(
          (e) => e.title.trim() && e.company.trim()
        );
      default:
        return true; // skippable steps are always "valid"
    }
  }

  const allMandatoryValid = stepValid(0) && stepValid(1) && stepValid(2);

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      // Drop empty work-experience rows before saving.
      const cleanedExperience = experience.filter(
        (e) => e.title.trim() && e.company.trim()
      );
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRoleTitles: roles,
          location,
          workExperience: cleanedExperience,
          resumeText: resumeText.trim() || undefined,
          sampleJds,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save profile");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Set up your job search</h1>
        <p className="mt-1 text-sm text-slate-500">
          Takes under 3 minutes. Everything here is editable later from Settings.
        </p>
      </header>

      {/* Progress dots */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? "bg-brand-600" : "bg-slate-200"
            }`}
            title={s.title}
          />
        ))}
      </div>

      <div className="card flex-1 p-6">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-lg font-semibold">{current.title}</h2>
          {current.required ? (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600">
              Required
            </span>
          ) : (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
              Optional
            </span>
          )}
        </div>

        <div className="mt-4">
          {current.key === "roles" && (
            <>
              <label className="label">Target role titles</label>
              <TagInput
                value={roles}
                onChange={setRoles}
                ariaLabel="Target role titles"
                placeholder="e.g. Backend Engineer — press Enter"
              />
              <p className="mt-2 text-xs text-slate-500">
                Add every title you&apos;d apply under. These drive fit scoring
                and source suggestions.
              </p>
            </>
          )}

          {current.key === "location" && (
            <>
              <label className="label">Cities and/or remote preference</label>
              <TagInput
                value={location}
                onChange={setLocation}
                ariaLabel="Locations"
                placeholder="e.g. Bengaluru, Remote (India) — press Enter"
              />
            </>
          )}

          {current.key === "experience" && (
            <>
              <label className="label">Past roles</label>
              <WorkExperienceEditor
                value={experience}
                onChange={setExperience}
              />
              <p className="mt-2 text-xs text-slate-500">
                At least one role with a title and company is required.
              </p>
            </>
          )}

          {current.key === "resume" && (
            <>
              <label className="label">Paste your resume text</label>
              <textarea
                className="input min-h-[220px]"
                placeholder="Paste plain-text resume (optional — you can add this later)"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
              <p className="mt-2 text-xs text-slate-500">
                When present, this gives the strongest signal for fit scoring.
                Safe to skip for now.
              </p>
            </>
          )}

          {current.key === "jds" && (
            <>
              <label className="label">
                Paste a few job descriptions you&apos;re targeting
              </label>
              <textarea
                className="input min-h-[140px]"
                placeholder="Paste one JD, then click Add"
                value={jdDraft}
                onChange={(e) => setJdDraft(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary mt-2"
                onClick={() => {
                  if (jdDraft.trim()) {
                    setSampleJds([...sampleJds, jdDraft.trim()]);
                    setJdDraft("");
                  }
                }}
              >
                + Add this JD
              </button>
              {sampleJds.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {sampleJds.map((jd, i) => (
                    <li
                      key={i}
                      className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600"
                    >
                      <span className="line-clamp-2">{jd.slice(0, 160)}…</span>
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() =>
                          setSampleJds(sampleJds.filter((_, idx) => idx !== i))
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          className="btn-ghost"
          disabled={step === 0 || saving}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          {!current.required && !isLast && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setStep((s) => s + 1)}
            >
              Skip
            </button>
          )}
          {!isLast ? (
            <button
              type="button"
              className="btn-primary"
              disabled={current.required && !stepValid(step)}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={!allMandatoryValid || saving}
              onClick={submit}
            >
              {saving ? "Saving…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>

      {isLast && !allMandatoryValid && (
        <p className="mt-2 text-right text-xs text-red-600">
          Fill roles, location, and one work experience entry to finish.
        </p>
      )}
    </div>
  );
}
