import type { applicationStatusValues } from "@/lib/validation";

export type ApplicationStatus = (typeof applicationStatusValues)[number];

/** Ordered pipeline used for the kanban columns and status dropdowns. */
export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  "saved",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  phone_screen: "Phone screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

// Tailwind classes for status chips/column headers. Neutral, role-agnostic.
export const STATUS_COLOR: Record<ApplicationStatus, string> = {
  saved: "bg-slate-100 text-slate-700",
  applied: "bg-blue-100 text-blue-700",
  phone_screen: "bg-indigo-100 text-indigo-700",
  interview: "bg-violet-100 text-violet-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-slate-100 text-slate-500",
};
