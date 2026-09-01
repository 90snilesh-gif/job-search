"use client";

import { useState } from "react";
import type { WorkExperienceEntry } from "@/db/schema";

/**
 * TagInput — collect an array of short strings (roles, locations, etc.).
 * Enter or comma commits the current text as a chip. Backspace on an empty
 * field removes the last chip.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const t = raw.trim().replace(/,$/, "").trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      {value.map((tag, i) => (
        <span key={`${tag}-${i}`} className="chip">
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            className="ml-0.5 text-brand-500 hover:text-brand-700"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        aria-label={ariaLabel}
        className="min-w-[8rem] flex-1 border-0 p-1 text-sm outline-none"
        placeholder={value.length === 0 ? placeholder : "Add more…"}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) commit(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && draft === "" && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && commit(draft)}
      />
    </div>
  );
}

/**
 * WorkExperienceEditor — repeatable rows of {title, company, years, summary}.
 * Stored as the JSONB array on profile.workExperience.
 */
export function WorkExperienceEditor({
  value,
  onChange,
}: {
  value: WorkExperienceEntry[];
  onChange: (next: WorkExperienceEntry[]) => void;
}) {
  function update(i: number, patch: Partial<WorkExperienceEntry>) {
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      {value.map((row, i) => (
        <div key={i} className="card space-y-2 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="input"
              placeholder="Role title *"
              value={row.title}
              onChange={(e) => update(i, { title: e.target.value })}
            />
            <input
              className="input"
              placeholder="Company *"
              value={row.company}
              onChange={(e) => update(i, { company: e.target.value })}
            />
          </div>
          <input
            className="input"
            placeholder="Years (e.g. 2021–2024)"
            value={row.years ?? ""}
            onChange={(e) => update(i, { years: e.target.value })}
          />
          <textarea
            className="input min-h-[60px]"
            placeholder="What you did (optional)"
            value={row.summary ?? ""}
            onChange={(e) => update(i, { summary: e.target.value })}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-ghost text-xs text-red-600 hover:bg-red-50"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary"
        onClick={() =>
          onChange([...value, { title: "", company: "", years: "", summary: "" }])
        }
      >
        + Add experience
      </button>
    </div>
  );
}
