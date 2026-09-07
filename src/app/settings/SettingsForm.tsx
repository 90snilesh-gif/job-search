"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TagInput, WorkExperienceEditor } from "@/components/inputs";
import type { Profile, WorkExperienceEntry } from "@/db/schema";

/**
 * Flat, always-editable profile form. Same fields as onboarding but no
 * stepping — this is where the user revises targets over time. Mandatory
 * fields are still enforced (server-side too) so a save can't blank them out.
 */
export default function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>(profile.targetRoleTitles);
  const [location, setLocation] = useState<string[]>(profile.location);
  const [experience, setExperience] = useState<WorkExperienceEntry[]>(
    (profile.workExperience as WorkExperienceEntry[]) ?? []
  );
  const [resumeText, setResumeText] = useState(profile.resumeText ?? "");
  const [sampleJds, setSampleJds] = useState<string[]>(profile.sampleJds ?? []);
  const [jdDraft, setJdDraft] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const cleanedExperience = experience.filter(
    (e) => e.title.trim() && e.company.trim()
  );
  const valid =
    roles.length > 0 && location.length > 0 && cleanedExperience.length > 0;

  async function save() {
    setMsg(null);
    if (!valid) {
      setMsg({
        ok: false,
        text: "Roles, location, and at least one work experience entry are required.",
      });
      return;
    }
    setSaving(true);
    try {
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
        throw new Error(data.error ?? "Save failed");
      }
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Settings — your profile</h1>
        <Link href="/dashboard" className="btn-secondary">
          ← Back
        </Link>
      </div>

      <p className="mb-6 text-sm text-slate-500">
        This profile drives fit scoring and source suggestions. Update it
        whenever your targets shift.
      </p>

      <div className="space-y-6">
        <div className="card p-4">
          <label className="label">Target role titles *</label>
          <TagInput value={roles} onChange={setRoles} ariaLabel="Target roles" />
        </div>

        <div className="card p-4">
          <label className="label">Location / remote preference *</label>
          <TagInput value={location} onChange={setLocation} ariaLabel="Locations" />
        </div>

        <div className="card p-4">
          <label className="label">Work experience *</label>
          <WorkExperienceEditor value={experience} onChange={setExperience} />
        </div>

        <div className="card p-4">
          <label className="label">Resume text (optional)</label>
          <textarea
            className="input min-h-[180px]"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste plain-text resume"
          />
        </div>

        <div className="card p-4">
          <label className="label">Sample JDs (optional)</label>
          <textarea
            className="input min-h-[120px]"
            value={jdDraft}
            onChange={(e) => setJdDraft(e.target.value)}
            placeholder="Paste one JD, then click Add"
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
            + Add JD
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
        </div>
      </div>

      {msg && (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
