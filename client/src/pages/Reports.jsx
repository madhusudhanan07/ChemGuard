import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import Toast from "../components/ui/Toast";
import { alertsApi, reagentApi, storageApi } from "../services/apiService";

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState({ reagents: false, storage: false, safety: false });

  function showToast(type, msg) {
    setToast({ type, message: msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function downloadReagents() {
    setLoading((l) => ({ ...l, reagents: true }));
    try {
      const data = await reagentApi.list({ archived: false });
      const ts = new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
      const csv = "Container ID,Chemical Name,CAS Number,Concentration,Hazard Classes,SDS Status\n" +
        data.map(r => [
          r.containerId || "",
          r.chemicalName || "",
          r.casNumber || "",
          r.concentration === "UNKNOWN" ? "UNKNOWN" : r.concentration + " " + (r.concentrationUnit || ""),
          Array.isArray(r.hazardClasses) ? r.hazardClasses.join("; ") : "",
          r.sdsStatus || "MISSING"
        ].map(v => String(v).replace(/,/g, ";")).join(",")).join("\n");
      downloadCSV(csv, "chemguard_inventory_" + ts + ".csv");
      showToast("success", "Reagent inventory CSV downloaded.");
    } catch (err) {
      showToast("error", "Failed to export reagents: " + err.message);
    } finally {
      setLoading((l) => ({ ...l, reagents: false }));
    }
  }

  async function downloadStorage() {
    setLoading((l) => ({ ...l, storage: true }));
    try {
      const data = await storageApi.list({ status: "ACTIVE" });
      const ts = new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
      const csv = "Location ID,Name,Type,Parent ID\n" +
        data.map(loc => [
          loc.locationId || "",
          loc.name || "",
          loc.type || "",
          loc.parentId || ""
        ].map(v => String(v).replace(/,/g, ";")).join(",")).join("\n");
      downloadCSV(csv, "chemguard_storage_" + ts + ".csv");
      showToast("success", "Storage location CSV downloaded.");
    } catch (err) {
      showToast("error", "Failed to export storage: " + err.message);
    } finally {
      setLoading((l) => ({ ...l, storage: false }));
    }
  }

  async function downloadSafetySummary() {
    setLoading((l) => ({ ...l, safety: true }));
    try {
      const [alerts, summary] = await Promise.all([
        alertsApi.list({ limit: 100 }),
        alertsApi.summary()
      ]);
      const ts = new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
      const csv = "Metric,Value\n" +
        "Total Open Alerts," + summary.open + "\n" +
        "Pending Review," + summary.pendingReview + "\n" +
        "SDS Issues," + summary.bySdsIssue + "\n" +
        "Incompatibilities," + summary.byIncompatibility + "\n\n" +
        "Alert ID,Type,Status,Reagent,Description\n" +
        alerts.map(a => [
          a.alertId || "",
          a.type || "",
          a.status || "",
          a.reagentName || "",
          (a.description || "").replace(/,/g, ";")
        ].join(",")).join("\n");
      downloadCSV(csv, "chemguard_safety_summary_" + ts + ".csv");
      showToast("success", "Safety summary CSV downloaded.");
    } catch (err) {
      showToast("error", "Failed to export safety summary: " + err.message);
    } finally {
      setLoading((l) => ({ ...l, safety: false }));
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        These CSV reports are derived from live Firestore data. They are NOT official safety certifications or compliance documents.
      </div>
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-teal-50"><FileText size={20} className="text-[#0D9488]" /></div>
          <div><h2 className="text-sm font-semibold text-[#0F172A]">Reagent Inventory Report</h2><p className="text-xs text-[#64748B] mt-0.5">All active reagents with CAS numbers, quantities, hazard classes, and SDS status.</p></div>
        </div>
        <button onClick={downloadReagents} disabled={loading.reagents} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white text-sm rounded-lg hover:bg-[#0F766E] transition-colors disabled:opacity-60">
          {loading.reagents ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {loading.reagents ? "Exporting…" : "Download CSV"}
        </button>
      </div>
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-teal-50"><FileText size={20} className="text-[#0D9488]" /></div>
          <div><h2 className="text-sm font-semibold text-[#0F172A]">Storage Location Summary</h2><p className="text-xs text-[#64748B] mt-0.5">All registered laboratories, cabinets, and compartments.</p></div>
        </div>
        <button onClick={downloadStorage} disabled={loading.storage} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white text-sm rounded-lg hover:bg-[#0F766E] transition-colors disabled:opacity-60">
          {loading.storage ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {loading.storage ? "Exporting…" : "Download CSV"}
        </button>
      </div>
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-teal-50"><FileText size={20} className="text-[#0D9488]" /></div>
          <div><h2 className="text-sm font-semibold text-[#0F172A]">Safety Summary Report</h2><p className="text-xs text-[#64748B] mt-0.5">Alert counts, SDS issues, and compatibility findings.</p></div>
        </div>
        <button onClick={downloadSafetySummary} disabled={loading.safety} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white text-sm rounded-lg hover:bg-[#0F766E] transition-colors disabled:opacity-60">
          {loading.safety ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {loading.safety ? "Exporting…" : "Download CSV"}
        </button>
      </div>
    </div>
  );
}