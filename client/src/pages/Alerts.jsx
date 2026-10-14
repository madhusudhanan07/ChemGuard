import { AlertTriangle, ExternalLink, RefreshCw, Search, ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import StatusBadge from "../components/ui/StatusBadge";
import Toast from "../components/ui/Toast";
import { alertsApi } from "../services/apiService";

const TYPE_META = {
  VERIFIED_INCOMPATIBILITY:  { icon: ShieldOff,   color: "text-[#DC2626]", bg: "bg-red-50",   border: "border-red-200",   label: "Verified Incompatibility" },
  MISSING_OR_UNVERIFIED_SDS: { icon: AlertTriangle,color: "text-[#D97706]", bg: "bg-amber-50", border: "border-amber-200", label: "Missing / Unverified SDS"  },
  MANUAL_REVIEW_REQUIRED:    { icon: ShieldAlert,  color: "text-[#D97706]", bg: "bg-amber-50", border: "border-amber-200", label: "Manual Review Required"     },
};

const STATUS_ORDER = { OPEN: 0, PENDING_REVIEW: 1, CLOSED: 2 };

function AlertCard({ alert }) {
  const meta = TYPE_META[alert.type] || TYPE_META.MANUAL_REVIEW_REQUIRED;
  const Icon = meta.icon;
  const ts = alert.createdAt?._seconds
    ? new Date(alert.createdAt._seconds * 1000).toLocaleString()
    : alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "";
  return (
    <div className={"bg-white rounded-xl border p-5 space-y-2 " + meta.border}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon size={18} className={"shrink-0 mt-0.5 " + meta.color} />
          <div className="min-w-0">
            <p className={"text-sm font-semibold " + meta.color}>{meta.label}</p>
            <p className="text-sm text-[#0F172A] mt-0.5">{alert.title}</p>
          </div>
        </div>
        <StatusBadge status={alert.status} />
      </div>
      <p className="text-xs text-[#64748B] leading-relaxed">{alert.description}</p>
      {alert.reagentName && (
        <p className="text-xs text-[#64748B]">
          <span className="font-medium">Reagent:</span> {alert.reagentName}
          {alert.casNumber && <span className="ml-1 font-mono text-[#94A3B8]">({alert.casNumber})</span>}
        </p>
      )}
      {alert.conflictReagentName && (
        <p className="text-xs text-[#64748B]"><span className="font-medium">Co-stored with:</span> {alert.conflictReagentName}</p>
      )}
      {alert.ruleId && (
        <p className="text-xs text-[#94A3B8]">Rule: <span className="font-mono">{alert.ruleId}</span>
          {alert.rulesetVersion && <span className="ml-1">(ruleset v{alert.rulesetVersion})</span>}
        </p>
      )}
      {alert.sourceUrl && (
        <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[#0D9488] hover:underline">
          <ExternalLink size={11} /> Verify source
        </a>
      )}
      {alert.evidenceReference && !alert.sourceUrl && (
        <p className="text-xs text-[#94A3B8]">{alert.evidenceReference}</p>
      )}
      <p className="text-xs text-[#94A3B8]">{ts}</p>
    </div>
  );
}

export default function Alerts() {
  const [alerts,    setAlerts]    = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [typeFilter,setTypeFilter]= useState("");
  const [statusFilter,setStatusFilter] = useState("");
  const [toast,     setToast]     = useState(null);
  const timer = useRef(null);

  function showToast(type, msg) {
    clearTimeout(timer.current);
    setToast({ type, message: msg });
    timer.current = setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter)   params.type   = typeFilter;
      const [alertData, summaryData] = await Promise.all([
        alertsApi.list(params),
        alertsApi.summary(),
      ]);
      setAlerts(Array.isArray(alertData) ? alertData : []);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message || "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const shown = search
    ? alerts.filter(a =>
        (a.reagentName || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.description || "").toLowerCase().includes(search.toLowerCase()))
    : alerts;

  const grouped = {
    OPEN:           shown.filter(a => a.status === "OPEN"),
    PENDING_REVIEW: shown.filter(a => a.status === "PENDING_REVIEW"),
    CLOSED:         shown.filter(a => a.status === "CLOSED"),
  };

  const inp = "px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-300";

  return (
    <div className="space-y-5">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {summary && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Open",             val: summary.open,              color: "text-[#DC2626]" },
            { label: "Pending Review",   val: summary.pendingReview,     color: "text-[#D97706]" },
            { label: "Incompatibilities",val: summary.byIncompatibility, color: "text-[#DC2626]" },
            { label: "SDS Issues",       val: summary.bySdsIssue,        color: "text-[#D97706]" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-[#E2E8F0] px-4 py-3">
              <p className="text-xs text-[#64748B]">{s.label}</p>
              <p className={"text-2xl font-semibold mt-0.5 " + s.color}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search alerts…"
            className={"pl-8 " + inp + " w-48"} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inp}>
          <option value="">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="PENDING_REVIEW">PENDING_REVIEW</option>
          <option value="CLOSED">CLOSED</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={inp}>
          <option value="">All types</option>
          <option value="MISSING_OR_UNVERIFIED_SDS">Missing / Unverified SDS</option>
          <option value="VERIFIED_INCOMPATIBILITY">Verified Incompatibility</option>
          <option value="MANUAL_REVIEW_REQUIRED">Manual Review Required</option>
        </select>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#0D9488] border border-teal-200 bg-teal-50 rounded-lg hover:bg-teal-100 disabled:opacity-50 transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          <strong>Could not load alerts.</strong> {error} — Verify the backend is running at http://127.0.0.1:5000
        </div>
      )}

      {!loading && !error && shown.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] py-16 text-center">
          <ShieldCheck size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">No alerts match the current filters.</p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Run <span className="font-mono text-xs">POST /api/alerts/evaluate</span> to scan reagent inventory for safety conditions.
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-5">
          {(["OPEN","PENDING_REVIEW","CLOSED"]).map(status => {
            const group = grouped[status];
            if (!group || group.length === 0) return null;
            const label = status === "PENDING_REVIEW" ? "Pending Review" : status.charAt(0) + status.slice(1).toLowerCase();
            return (
              <div key={status}>
                <h2 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
                  {label} ({group.length})
                </h2>
                <div className="space-y-3">
                  {group.map(a => <AlertCard key={a.alertId} alert={a} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        Alert acknowledgement and resolution workflows require Administrator authentication (deferred to the final phase).
        Physical storage assignment writes remain disabled.
      </div>
    </div>
  );
}