import { Loader2, RefreshCw, ScrollText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Toast from "../components/ui/Toast";
import { auditApi } from "../services/apiService";

const EVENT_TYPES = [
  "REAGENT_CREATE",
  "REAGENT_UPDATE",
  "REAGENT_ARCHIVE",
  "REAGENT_RESTORE",
  "LOCATION_CREATE",
  "LOCATION_DELETE",
  "LOCATION_RENAME",
  "ALERT_EVALUATION",
];

export default function Audit() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filter) params.eventType = filter;
      const data = await auditApi.list(params);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load audit log.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  function showToast(type, msg) {
    clearTimeout(timer.current);
    setToast({ type, message: msg });
    timer.current = setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-5">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        <strong>Development audit trail:</strong> This is a server-side event log for development visibility. 
        It is NOT a compliance-certified audit system. Authentication, actor tracking, and tamper-proofing 
        are deferred to the authentication phase.
      </div>

      <div className="flex items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:outline-none"
        >
          <option value="">All event types</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-[#0D9488] hover:underline disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          <strong>Could not load audit log.</strong> {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 size={24} className="animate-spin text-[#0D9488] mx-auto mb-2" />
            <p className="text-sm text-[#64748B]">Loading from Firestore…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-[#64748B]">
              {error
                ? "Could not load audit records."
                : filter
                ? "No audit records match the selected filter."
                : "No audit records yet. Perform inventory or storage actions to generate entries."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-slate-50">
                  {["Timestamp", "Event", "Summary"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wide text-left whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {entries.map((e) => {
                  const ts = e.timestamp?._seconds
                    ? new Date(e.timestamp._seconds * 1000).toLocaleString()
                    : e.timestamp
                    ? new Date(e.timestamp).toLocaleString()
                    : "";
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">
                        {ts}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {(e.eventType || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#0F172A]">{e.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}