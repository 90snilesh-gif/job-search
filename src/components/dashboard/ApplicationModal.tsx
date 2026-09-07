"use client";

import { useState } from "react";
import {
  APPLICATION_STATUS_ORDER,
  STATUS_LABEL,
  type ApplicationStatus,
} from "@/lib/constants";
import type { ApplicationWithJob } from "@/lib/applications";

/**
 * One modal for both "quick add" and "edit". In add mode it captures the
 * inline job fields (company + role) plus application fields; in edit mode the
 * job identity is fixed and only application fields are editable.
 */

export type ModalMode =
  | { kind: "add" }
  | { kind: "edit"; application: ApplicationWithJob };

export function ApplicationModal({
  mode,
  onClose,
  onSaved,
}: {
  mode: ModalMode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = mode.kind === "edit";
  const existing = isEdit ? mode.application : undefined;

  const [company, setCompany] = useState(existing?.company ?? "");
  const [roleTitle, setRoleTitle] = useState(existing?.roleTitle ?? "");
  const [jdUrl, setJdUrl] = useState(existing?.jdUrl ?? "");
  const [location, setLocation] = useState(existing?.jobLocation ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(
    (existing?.status as ApplicationStatus) ?? "saved"
  );
  const [dateApplied, setDateApplied] = useState(existing?.dateApplied ?? "");
  const [nextAction, setNextAction] = useState(existing?.nextAction ?? "");
  const [nextActionDate, setNextActionDate] = useState(
    existing?.nextActionDate ?? ""
  );
  const [resumeVersion, setResumeVersion] = useState(
    existing?.resumeVersion ?? ""
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side guard mirrors the server validation for fast feedback.
  const addValid = company.trim() && roleTitle.trim();

  async function save() {
    setError(null);
    if (!isEdit && !addValid) {
      setError("Company and role title are required.");
      return;
    }
    setSaving(true);
    try {
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/applications/${existing!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            dateApplied: dateApplied || "",
            nextAction,
            nextActionDate: nextActionDate || "",
            resumeVersion,
            notes,
          }),
        });
      } else {
        res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company,
            roleTitle,
            jdUrl: jdUrl || undefined,
            location: location || undefined,
            status,
            dateApplied: dateApplied || "",
            nextAction,
            nextActionDate: nextActionDate || "",
            resumeVersion,
            notes,
          }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit application" : "Add application"}
          </h2>
          <button className="btn-ghost px-2" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Company *</label>
              <input
                className="input"
                value={company}
                disabled={isEdit}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Role title *</label>
              <input
                className="input"
                value={roleTitle}
                disabled={isEdit}
                onChange={(e) => setRoleTitle(e.target.value)}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">JD URL</label>
                <input
                  className="input"
                  placeholder="https://…"
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  className="input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              >
                {APPLICATION_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date applied</label>
              <input
                type="date"
                className="input"
                value={dateApplied}
                onChange={(e) => setDateApplied(e.target.value)}
              />
            </div>
          </div>

          {/* Next action is emphasized — it's what keeps the search moving. */}
          <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3">
            <label className="label text-brand-700">Next action</label>
            <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
              <input
                className="input"
                placeholder="e.g. Follow up with recruiter"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
              />
              <input
                type="date"
                className="input"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Resume version</label>
            <input
              className="input"
              placeholder="e.g. backend-v3"
              value={resumeVersion}
              onChange={(e) => setResumeVersion(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input min-h-[70px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add application"}
          </button>
        </div>
      </div>
    </div>
  );
}
