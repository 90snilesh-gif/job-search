"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  APPLICATION_STATUS_ORDER,
  STATUS_COLOR,
  STATUS_LABEL,
  type ApplicationStatus,
} from "@/lib/constants";
import {
  computeStats,
  isStale,
  type ApplicationWithJob,
} from "@/lib/stats";
import { ApplicationModal, type ModalMode } from "./ApplicationModal";

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  return (
    <div className="card p-4">
      <div
        className={`text-2xl font-semibold ${
          tone === "warn" && value > 0 ? "text-amber-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

export default function DashboardClient({
  initialApps,
}: {
  initialApps: ApplicationWithJob[];
}) {
  const router = useRouter();
  const [apps, setApps] = useState(initialApps);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [modal, setModal] = useState<ModalMode | null>(null);

  // Stats are derived from the client's own row state so they stay correct
  // after mutations without depending on a server-prop refresh.
  const stats = useMemo(() => computeStats(apps), [apps]);

  // Re-sync rows from the joined list endpoint after any mutation.
  async function refresh() {
    const res = await fetch("/api/applications");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.applications)) setApps(data.applications);
    }
    router.refresh();
    setModal(null);
  }

  async function moveStatus(id: string, status: ApplicationStatus) {
    // Optimistic update, then reconcile from the server.
    setApps((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              lastUpdated: new Date().toISOString() as unknown as Date,
            }
          : a
      )
    );
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    refresh();
  }

  async function archive(id: string) {
    if (
      !confirm(
        "Archive this application? It stays in history but leaves the board."
      )
    )
      return;
    setApps((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    refresh();
  }

  // Upcoming / overdue next actions across all apps, soonest first.
  const nextActions = useMemo(
    () =>
      apps
        .filter((a) => a.nextAction && a.nextActionDate)
        .sort((a, b) =>
          (a.nextActionDate ?? "").localeCompare(b.nextActionDate ?? "")
        ),
    [apps]
  );

  const columns = useMemo(() => {
    const byStatus: Record<string, ApplicationWithJob[]> = {};
    for (const s of APPLICATION_STATUS_ORDER) byStatus[s] = [];
    for (const a of apps) (byStatus[a.status] ??= []).push(a);
    return byStatus;
  }, [apps]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Applications</h1>
          <p className="text-sm text-slate-500">Your active pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings" className="btn-secondary">
            Settings
          </Link>
          <button className="btn-primary" onClick={() => setModal({ kind: "add" })}>
            + Quick add
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Applied this week" value={stats.appliedThisWeek} />
        <StatCard label="Awaiting >7 days" value={stats.staleAwaiting} tone="warn" />
        <StatCard label="Interviewing" value={stats.interviewing} />
        <StatCard label="Active pipeline" value={stats.activePipeline} />
      </section>

      {/* Next actions strip */}
      {nextActions.length > 0 && (
        <section className="card mb-6 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Next actions
          </h2>
          <ul className="space-y-1.5">
            {nextActions.slice(0, 6).map((a) => {
              const overdue = (a.nextActionDate ?? "") < today;
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate">
                    <span className="font-medium">{a.nextAction}</span>{" "}
                    <span className="text-slate-500">
                      · {a.company} — {a.roleTitle}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                      overdue
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {overdue ? "Overdue · " : ""}
                    {a.nextActionDate}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* View toggle */}
      <div className="mb-4 flex items-center gap-2">
        <button
          className={view === "kanban" ? "btn-primary" : "btn-secondary"}
          onClick={() => setView("kanban")}
        >
          Kanban
        </button>
        <button
          className={view === "table" ? "btn-primary" : "btn-secondary"}
          onClick={() => setView("table")}
        >
          Table
        </button>
      </div>

      {/* Empty state */}
      {apps.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <p className="text-slate-600">No applications yet.</p>
          <p className="max-w-sm text-sm text-slate-500">
            Add the first role you&apos;re tracking. Quick add takes ten seconds
            — just company and title to start.
          </p>
          <button className="btn-primary" onClick={() => setModal({ kind: "add" })}>
            + Add your first application
          </button>
        </div>
      ) : view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {APPLICATION_STATUS_ORDER.map((status) => (
            <div key={status} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[status]}`}
                >
                  {STATUS_LABEL[status]}
                </span>
                <span className="text-xs text-slate-400">
                  {columns[status].length}
                </span>
              </div>
              <div className="space-y-2">
                {columns[status].map((a) => (
                  <Card
                    key={a.id}
                    app={a}
                    onEdit={() => setModal({ kind: "edit", application: a })}
                    onArchive={() => archive(a.id)}
                    onMove={(s) => moveStatus(a.id, s)}
                  />
                ))}
                {columns[status].length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                    Empty
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Company</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Next action</th>
                <th className="p-3">Applied</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium">
                    {a.company}
                    {isStale(a) && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        stale
                      </span>
                    )}
                  </td>
                  <td className="p-3">{a.roleTitle}</td>
                  <td className="p-3">
                    <select
                      className="rounded border border-slate-200 px-1.5 py-1 text-xs"
                      value={a.status}
                      onChange={(e) =>
                        moveStatus(a.id, e.target.value as ApplicationStatus)
                      }
                    >
                      {APPLICATION_STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-slate-600">
                    {a.nextAction ? (
                      <span>
                        {a.nextAction}
                        {a.nextActionDate ? ` · ${a.nextActionDate}` : ""}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500">{a.dateApplied ?? "—"}</td>
                  <td className="p-3 text-right">
                    <button
                      className="btn-ghost px-2 py-1 text-xs"
                      onClick={() => setModal({ kind: "edit", application: a })}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-ghost px-2 py-1 text-xs text-red-600"
                      onClick={() => archive(a.id)}
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ApplicationModal
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function Card({
  app,
  onEdit,
  onArchive,
  onMove,
}: {
  app: ApplicationWithJob;
  onEdit: () => void;
  onArchive: () => void;
  onMove: (s: ApplicationStatus) => void;
}) {
  const stale = isStale(app);
  return (
    <div className="card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{app.company}</div>
          <div className="truncate text-sm text-slate-500">{app.roleTitle}</div>
        </div>
        {typeof app.fitScore === "number" && (
          <span className="chip shrink-0" title="Fit score">
            {app.fitScore}/10
          </span>
        )}
      </div>

      {app.nextAction && (
        <div className="mt-2 rounded bg-brand-50 px-2 py-1 text-xs text-brand-700">
          {app.nextAction}
          {app.nextActionDate ? ` · ${app.nextActionDate}` : ""}
        </div>
      )}

      {stale && (
        <div className="mt-2 text-xs font-medium text-amber-600">
          ⚠ Awaiting reply &gt; 7 days
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <select
          className="rounded border border-slate-200 px-1.5 py-1 text-xs"
          value={app.status}
          onChange={(e) => onMove(e.target.value as ApplicationStatus)}
          aria-label="Move status"
        >
          {APPLICATION_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          <button className="btn-ghost px-2 py-1 text-xs" onClick={onEdit}>
            Edit
          </button>
          <button
            className="btn-ghost px-2 py-1 text-xs text-red-600"
            onClick={onArchive}
          >
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}
