import { AlertOctagon, AlertTriangle, CheckCircle, ExternalLink, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Toast from '../components/ui/Toast';
import { compatibilityApi, reagentApi, storageApi } from '../services/apiService';

function ResultPanel({ result }) {
  if (!result) return null;
  const r = result.result;
  const styles = {
    INCOMPATIBLE:           { border: 'border-red-300',    bg: 'bg-red-50',    icon: ShieldAlert,   iconColor: 'text-[#DC2626]', label: 'INCOMPATIBLE', labelColor: 'text-[#DC2626]' },
    NEEDS_REVIEW:           { border: 'border-amber-300',  bg: 'bg-amber-50',  icon: AlertTriangle, iconColor: 'text-[#D97706]', label: 'NEEDS REVIEW',  labelColor: 'text-[#D97706]' },
    NO_DOCUMENTED_CONFLICT: { border: 'border-teal-300',   bg: 'bg-teal-50',   icon: CheckCircle,   iconColor: 'text-[#0D9488]', label: 'NO DOCUMENTED CONFLICT', labelColor: 'text-[#0D9488]' },
  };
  const s = styles[r] || styles.NEEDS_REVIEW;
  const Icon = s.icon;
  return (
    <div className={'rounded-xl border p-5 space-y-4 ' + s.border + ' ' + s.bg}>
      <div className='flex items-center gap-3'>
        <Icon size={22} className={s.iconColor + ' shrink-0'} />
        <span className={'text-base font-bold ' + s.labelColor}>{s.label}</span>
        <span className='ml-auto text-xs text-[#94A3B8]'>Ruleset v{result.rulesetVersion}</span>
      </div>
      {r === 'INCOMPATIBLE' && result.conflicts && result.conflicts.map((c, i) => (
        <div key={i} className='rounded-lg bg-white border border-red-200 p-3 space-y-1.5'>
          <p className='text-sm font-medium text-[#0F172A]'>Conflict with: {c.occupantName} ({c.occupantCas})</p>
          <p className='text-xs text-[#64748B]'>{c.conflictDescription}</p>
          <p className='text-xs text-[#64748B]'>Rule: <span className='font-mono'>{c.ruleId}</span></p>
          {c.source && (
            <div className='text-xs text-[#94A3B8]'>
              <span className='font-medium'>Source: </span>{c.source.title} — {c.source.organization}
              {c.source.section && <span> ({c.source.section})</span>}
              {c.source.url && <a href={c.source.url} target='_blank' rel='noopener noreferrer' className='ml-1.5 inline-flex items-center gap-0.5 text-[#0D9488] hover:underline'><ExternalLink size={11} /> Verify source</a>}
            </div>
          )}
        </div>
      ))}
      {r === 'NEEDS_REVIEW' && result.triggers && result.triggers.map((t, i) => (
        <div key={i} className='rounded-lg bg-white border border-amber-200 p-3'>
          <p className='text-xs font-medium text-amber-800'>{t.reason.replace(/_/g, ' ')}</p>
          <p className='text-xs text-[#64748B] mt-0.5'>{t.detail}</p>
          {t.occupantName && <p className='text-xs text-[#94A3B8] mt-0.5'>Related to: {t.occupantName}</p>}
        </div>
      ))}
      {r === 'NO_DOCUMENTED_CONFLICT' && (
        <div className='rounded-lg bg-white border border-teal-200 p-3'>
          <p className='text-xs text-[#64748B]'>{result.disclaimer}</p>
        </div>
      )}
      <p className='text-xs text-[#94A3B8]'>Checked at: {new Date(result.evaluatedAt).toLocaleString()} &bull; Compartment: {result.compartment?.name}</p>
      <div className='rounded-lg bg-white border border-[#E2E8F0] p-3 text-xs text-amber-800'>
        <strong>Storage assignment is not yet enabled.</strong> This check is a dry-run only. Physical storage assignment writes require the full assignment transaction and safety enforcement to be separately implemented and tested.
      </div>
    </div>
  );
}

export default function Compatibility() {
  const [reagents,     setReagents]     = useState([]);
  const [compartments, setCompartments] = useState([]);
  const [reagentId,    setReagentId]    = useState('');
  const [compId,       setCompId]       = useState('');
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [toast,        setToast]        = useState(null);
  const [reagentAId,   setReagentAId]   = useState('');
  const [reagentBId,   setReagentBId]   = useState('');
  const [pairResult,   setPairResult]   = useState(null);
  const [pairLoading,  setPairLoading]  = useState(false);
  const timer = useRef(null);

  function showToast(type, msg) { clearTimeout(timer.current); setToast({ type, message: msg }); timer.current = setTimeout(() => setToast(null), 5000); }

  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      try {
        const [rList, lList] = await Promise.all([
          reagentApi.list({ archived: 'false' }),
          storageApi.list({ type: 'COMPARTMENT' }),
        ]);
        setReagents(Array.isArray(rList) ? rList : []);
        setCompartments(Array.isArray(lList) ? lList : []);
      } catch (err) {
        showToast('error', 'Could not load reagents or compartments: ' + err.message);
      } finally { setDataLoading(false); }
    }
    loadData();
  }, []);

  const selReagent = reagents.find(r => r.reagentId === reagentId);

  async function runCompare() {
    if (!reagentAId || !reagentBId) return;
    setPairLoading(true); setPairResult(null);
    try {
      const data = await compatibilityApi.compare(reagentAId, reagentBId);
      setPairResult(data);
    } catch (err) {
      showToast('error', 'Comparison failed: ' + err.message);
    } finally { setPairLoading(false); }
  }
  async function runCheck() {
    if (!reagentId || !compId) return;
    setLoading(true); setResult(null);
    try {
      const data = await compatibilityApi.check(reagentId, compId);
      setResult(data);
    } catch (err) {
      showToast('error', 'Compatibility check failed: ' + err.message);
    } finally { setLoading(false); }
  }

  const inp = 'w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300';

  return (
    <div className='max-w-2xl space-y-5'>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800'>
        <strong>Dry-run check only.</strong> This verifies storage compatibility but does not create a storage assignment. Assignments require a separate implementation phase.
      </div>
      <div className='bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4'>
        <h2 className='text-sm font-semibold text-[#0F172A]'>Select Reagent and Compartment</h2>
        {dataLoading ? (
          <div className='flex items-center gap-2 text-sm text-[#64748B]'><Loader2 size={15} className='animate-spin' /> Loading from Firestore…</div>
        ) : (
          <div className='space-y-3'>
            <div>
              <label className='block text-xs font-medium text-[#0F172A] mb-1'>Reagent</label>
              <select value={reagentId} onChange={e => { setReagentId(e.target.value); setResult(null); }} className={inp}>
                <option value=''>Select a reagent…</option>
                {reagents.map(r => <option key={r.reagentId} value={r.reagentId}>{r.chemicalName} — {r.casNumber} [{r.sdsStatus}]</option>)}
              </select>
            </div>
            <div>
              <label className='block text-xs font-medium text-[#0F172A] mb-1'>Target Compartment</label>
              <select value={compId} onChange={e => { setCompId(e.target.value); setResult(null); }} className={inp}>
                <option value=''>Select a compartment…</option>
                {compartments.map(c => <option key={c.locationId} value={c.locationId}>{c.name} ({c.path || c.name})</option>)}
              </select>
            </div>
            {selReagent && (
              <div className='bg-slate-50 rounded-lg p-3 text-xs space-y-1 border border-[#E2E8F0]'>
                <p><span className='font-medium'>Chemical:</span> {selReagent.chemicalName}</p>
                <p><span className='font-medium'>CAS:</span> {selReagent.casNumber}</p>
                <p><span className='font-medium'>SDS Status:</span> <span className={selReagent.sdsStatus === 'VERIFIED' ? 'text-green-700' : 'text-amber-700'}>{selReagent.sdsStatus}</span></p>
                <p><span className='font-medium'>Hazard Classes:</span> {Array.isArray(selReagent.hazardClasses) ? selReagent.hazardClasses.join(', ') : selReagent.hazardClasses}</p>
              </div>
            )}
            <button
              onClick={runCheck}
              disabled={!reagentId || !compId || loading}
              className='flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#0D9488] text-white text-sm rounded-lg hover:bg-[#0F766E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
              {loading ? <><Loader2 size={15} className='animate-spin' /> Checking…</> : <><RefreshCw size={15} /> Check Compatibility</>}
            </button>
          </div>
        )}
      </div>
      {!result && !loading && (
        <div className='bg-white rounded-xl border border-[#E2E8F0] p-8 text-center'>
          <AlertOctagon size={28} className='text-slate-300 mx-auto mb-2' />
          <p className='text-sm text-[#64748B]'>Select a reagent and compartment, then click Check Compatibility.</p>
          <p className='text-xs text-[#94A3B8] mt-1'>Possible results: INCOMPATIBLE · NEEDS_REVIEW · NO_DOCUMENTED_CONFLICT</p>
        </div>
      )}
      {loading && (
        <div className='bg-white rounded-xl border border-[#E2E8F0] p-8 text-center'>
          <Loader2 size={28} className='animate-spin text-[#0D9488] mx-auto mb-2' />
          <p className='text-sm text-[#64748B]'>Running compatibility check…</p>
        </div>
      )}
      {result && <ResultPanel result={result} />}
    </div>
  );
}
