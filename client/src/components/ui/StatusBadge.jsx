const STYLES = {
  VERIFIED:               "bg-green-50 text-green-700 border-green-200",
  UNVERIFIED:             "bg-amber-50 text-amber-700 border-amber-200",
  MISSING:                "bg-red-50 text-red-700 border-red-200",
  OPEN:                   "bg-red-50 text-red-700 border-red-200",
  PENDING_REVIEW:         "bg-amber-50 text-amber-700 border-amber-200",
  CLOSED:                 "bg-slate-100 text-slate-600 border-slate-200",
  ACTIVE:                 "bg-teal-50 text-teal-700 border-teal-200",
  INACTIVE:               "bg-slate-100 text-slate-500 border-slate-200",
  INCOMPATIBLE:           "bg-red-50 text-red-700 border-red-200",
  NEEDS_REVIEW:           "bg-amber-50 text-amber-700 border-amber-200",
  NO_DOCUMENTED_CONFLICT: "bg-teal-50 text-teal-700 border-teal-200",
  ARCHIVED:               "bg-slate-100 text-slate-500 border-slate-200",
};
const LABELS = {
  NO_DOCUMENTED_CONFLICT: "No Documented Conflict",
  PENDING_REVIEW:         "Pending Review",
};
export default function StatusBadge({ status }) {
  const style = STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  const label = LABELS[status] ?? (status ?? "").replace(/_/g, " ");
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${style}`}>{label}</span>;
}
