import { Activity, AlertTriangle, CheckCircle, ChevronRight, Edit3, ExternalLink, FlaskConical, FolderOpen, Loader2, Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import Toast from '../components/ui/Toast';
import { compatibilityApi, reagentApi, storageApi } from '../services/apiService';

function childrenOf(all, pid) { return all.filter(l => pid === null ? !l.parentId : l.parentId === pid); }
function typeFor(parent) { if (!parent) return 'LAB'; if (parent.type === 'LAB') return 'CABINET'; if (parent.type === 'CABINET') return 'COMPARTMENT'; return null; }

function Tree({ all, parentId, depth, onSelect, selected }) {
  const nodes = childrenOf(all, parentId);
  if (!nodes.length) return null;
  return (
    <ul className={depth > 0 ? 'pl-5 border-l border-[#E2E8F0] ml-2' : ''}>
      {nodes.map(loc => {
        const isSelected = selected && selected.locationId === loc.locationId;
        const hasKids = all.some(l => l.parentId === loc.locationId);
        const [open, setOpen] = useState(true);
        return (
          <li key={loc.locationId}>
            <div onClick={() => onSelect(loc)} className={'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ' + (isSelected ? 'bg-teal-50 text-[#0D9488] font-medium' : 'text-[#0F172A] hover:bg-slate-50')}>
              {hasKids ? <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }} className='shrink-0 text-[#94A3B8]'><ChevronRight size={14} className={'transition-transform ' + (open ? 'rotate-90' : '')} /></button> : <span className='w-4 shrink-0' />}
              <FolderOpen size={15} className='shrink-0' />
              <span className='truncate'>{loc.name}</span>
              <span className='ml-auto text-xs text-[#94A3B8]'>{loc.type}</span>
            </div>
            {open && hasKids && <Tree all={all} parentId={loc.locationId} depth={depth+1} onSelect={onSelect} selected={selected} />}
          </li>
        );
      })}
    </ul>
  );
}

const RESULT_STYLE = {
  INCOMPATIBLE:           { border:'border-red-200',   bg:'bg-red-50',   icon:ShieldAlert,   ic:'text-[#DC2626]', label:'INCOMPATIBLE' },
  NEEDS_REVIEW:           { border:'border-amber-200', bg:'bg-amber-50', icon:AlertTriangle, ic:'text-[#D97706]', label:'NEEDS REVIEW' },
  NO_DOCUMENTED_CONFLICT: { border:'border-teal-200',  bg:'bg-teal-50',  icon:CheckCircle,   ic:'text-[#0D9488]', label:'NO DOCUMENTED CONFLICT' },
};

function CompatPreview({ compartmentId, reagents }) {
  const [reagentId, setReagentId] = useState('');
  const [result,    setResult]    = useState(null);
  const [checking,  setChecking]  = useState(false);
  const [error,     setError]     = useState(null);

  async function runCheck() {
    if (!reagentId) return;
    setChecking(true); setResult(null); setError(null);
    try { setResult(await compatibilityApi.check(reagentId, compartmentId)); }
    catch (e) { setError(e.message); }
    finally { setChecking(false); }
  }

  const inp = 'flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300';
  const s = result ? (RESULT_STYLE[result.result] || RESULT_STYLE.NEEDS_REVIEW) : null;

  return (
    <div className='pt-4 border-t border-[#E2E8F0] space-y-3'>
      <h3 className='text-xs font-semibold text-[#0F172A] uppercase tracking-wide flex items-center gap-1.5'><Activity size={13} /> Compatibility Preview (dry-run)</h3>
      <div className='flex gap-2'>
        <select value={reagentId} onChange={e => { setReagentId(e.target.value); setResult(null); setError(null); }} className={inp}>
          <option value=''>Select reagent to preview…</option>
          {reagents.map(r => <option key={r.reagentId} value={r.reagentId}>{r.chemicalName} ({r.casNumber}) [{r.sdsStatus}]</option>)}
        </select>
        <button onClick={runCheck} disabled={!reagentId || checking}
          className='flex items-center gap-1.5 px-3 py-2 bg-[#0D9488] text-white text-sm rounded-lg hover:bg-[#0F766E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
          {checking ? <Loader2 size={14} className='animate-spin' /> : <RefreshCw size={14} />}
          {checking ? 'Checking…' : 'Check'}
        </button>
      </div>
      {error && <p className='text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2'>{error}</p>}
      {result && s && (
        <div className={'rounded-xl border p-4 space-y-3 ' + s.border + ' ' + s.bg}>
          <div className='flex items-center gap-2'><s.icon size={16} className={s.ic} /><span className={'text-sm font-bold ' + s.ic}>{s.label}</span><span className='ml-auto text-xs text-[#94A3B8]'>v{result.rulesetVersion}</span></div>
          {result.result === 'INCOMPATIBLE' && result.conflicts && result.conflicts.map((c, i) => (
            <div key={i} className='bg-white border border-red-200 rounded-lg p-3 space-y-1'>
              <p className='text-xs font-medium text-[#0F172A]'>Conflict with: {c.occupantName} ({c.occupantCas})</p>
              <p className='text-xs text-[#64748B]'>{c.conflictDescription}</p>
              <p className='text-xs text-[#94A3B8]'>Rule: <span className='font-mono'>{c.ruleId}</span> &bull; {c.source?.organization}
                {c.source?.url && <a href={c.source.url} target='_blank' rel='noopener noreferrer' className='ml-1 text-[#0D9488] hover:underline inline-flex items-center gap-0.5'><ExternalLink size={10}/> verify</a>}
              </p>
            </div>
          ))}
          {result.result === 'NEEDS_REVIEW' && result.triggers && result.triggers.map((t, i) => (
            <div key={i} className='bg-white border border-amber-200 rounded-lg p-3'>
              <p className='text-xs font-medium text-amber-800'>{t.reason.replace(/_/g, ' ')}</p>
              <p className='text-xs text-[#64748B] mt-0.5'>{t.detail}</p>
              {t.occupantName && <p className='text-xs text-[#94A3B8] mt-0.5'>Related: {t.occupantName}</p>}
            </div>
          ))}
          {result.result === 'NO_DOCUMENTED_CONFLICT' && (
            <p className='text-xs text-[#64748B] bg-white border border-teal-200 rounded-lg p-3'>{result.disclaimer}</p>
          )}
          <p className='text-xs text-[#94A3B8]'>Preview only. Storage assignment writes remain blocked until authentication and safety enforcement are implemented.</p>
        </div>
      )}
    </div>
  );
}

function CompartmentDetail({ selected, reagents, allLocs }) {
  const [occupants,    setOccupants]    = useState(null);
  const [loadingOcc,   setLoadingOcc]   = useState(false);
  const [occError,     setOccError]     = useState(null);

  useEffect(() => {
    if (!selected || selected.type !== 'COMPARTMENT') { setOccupants(null); return; }
    setLoadingOcc(true); setOccError(null);
    storageApi.occupants(selected.locationId)
      .then(d => setOccupants(d.occupants || []))
      .catch(e => { setOccError(e.message); setOccupants([]); })
      .finally(() => setLoadingOcc(false));
  }, [selected]);

  if (!selected) return null;
  return (
    <div className='space-y-4'>
      {selected.type === 'COMPARTMENT' && (
        <>
          <div className='space-y-2'>
            <h3 className='text-xs font-semibold text-[#0F172A] uppercase tracking-wide flex items-center gap-1.5'><FlaskConical size={13} /> Current Residents</h3>
            {loadingOcc && <div className='flex items-center gap-2 text-xs text-[#64748B]'><Loader2 size={13} className='animate-spin' /> Loading from Firestore…</div>}
            {occError && <p className='text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-lg p-2'>{occError}</p>}
            {!loadingOcc && !occError && occupants !== null && (
              occupants.length === 0
                ? <p className='text-xs text-[#94A3B8] italic'>No reagents currently assigned to this compartment.</p>
                : <div className='overflow-x-auto'><table className='w-full text-xs border border-[#E2E8F0] rounded-lg overflow-hidden'>
                    <thead><tr className='bg-slate-50 border-b border-[#E2E8F0]'>{['Name','CAS','Concentration','Qty','SDS'].map(h => <th key={h} className='px-3 py-2 text-left font-medium text-[#64748B]'>{h}</th>)}</tr></thead>
                    <tbody className='divide-y divide-[#E2E8F0]'>{occupants.map(r => (
                      <tr key={r.reagentId} className='hover:bg-slate-50'>
                        <td className='px-3 py-2 font-medium text-[#0F172A]'>{r.chemicalName}</td>
                        <td className='px-3 py-2 font-mono text-[#64748B]'>{r.casNumber}</td>
                        <td className='px-3 py-2 text-[#64748B]'>{r.concentration === 'UNKNOWN' ? 'UNKNOWN' : r.concentration + ' ' + (r.concentrationUnit || '')}</td>
                        <td className='px-3 py-2 text-[#64748B]'>{r.quantityOnHand} {r.quantityUnit}</td>
                        <td className='px-3 py-2'><StatusBadge status={r.sdsStatus} /></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
            )}
          </div>
          <CompatPreview compartmentId={selected.locationId} reagents={reagents} />
        </>
      )}
    </div>
  );
}

export default function Storage() {
  const [locs,      setLocs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [reagents,  setReagents]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [modal,     setModal]     = useState(null);
  const [newName,   setNewName]   = useState('');
  const [renaming,  setRenaming]  = useState(null);
  const [toast,     setToast]     = useState(null);
  const timer = useRef(null);

  async function refresh() {
    setLoading(true);
    try {
      const [locData, reagentData] = await Promise.all([storageApi.list(), reagentApi.list({ archived: 'false' })]);
      setLocs(Array.isArray(locData) ? locData : []);
      setReagents(Array.isArray(reagentData) ? reagentData : []);
    } catch (err) { showToast('error', 'Could not load data: ' + err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  function showToast(type, msg) { clearTimeout(timer.current); setToast({ type, message: msg }); timer.current = setTimeout(() => setToast(null), 4000); }
  const nextType = selected ? typeFor(selected) : 'LAB';

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      await storageApi.create({ type: nextType, name: newName.trim(), parentId: selected ? selected.locationId : null });
      showToast('success', nextType + ' created.'); setNewName(''); setModal(null); await refresh();
    } catch (err) { showToast('error', err.message); }
  }

  async function handleDelete(loc) {
    try {
      await storageApi.delete(loc.locationId);
      showToast('success', 'Deleted.'); if (selected && selected.locationId === loc.locationId) setSelected(null); await refresh();
    } catch (err) { showToast('error', err.message); }
  }

  async function handleRename() {
    if (!renaming || !newName.trim()) return;
    try {
      await storageApi.rename(renaming.locationId, newName.trim());
      showToast('success', 'Renamed.'); setModal(null); setRenaming(null); setNewName(''); await refresh();
    } catch (err) { showToast('error', err.message); }
  }

  return (
    <div className='space-y-5'>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Left: hierarchy tree */}
        <div className='bg-white rounded-xl border border-[#E2E8F0] p-5 lg:col-span-1'>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-sm font-semibold text-[#0F172A]'>Location Hierarchy</h2>
            <button onClick={() => { setNewName(''); setModal('add'); }} className='flex items-center gap-1 text-xs text-[#0D9488] hover:underline'><Plus size={13} /> Add</button>
          </div>
          {loading
            ? <div className='py-8 text-center'><Loader2 size={20} className='animate-spin text-[#0D9488] mx-auto' /></div>
            : locs.length === 0
              ? <p className='text-sm text-[#94A3B8] text-center py-8'>No locations yet. Add a Laboratory to begin.</p>
              : <Tree all={locs} parentId={null} depth={0} onSelect={setSelected} selected={selected} />
          }
        </div>

        {/* Right: detail panel */}
        <div className='bg-white rounded-xl border border-[#E2E8F0] p-5 lg:col-span-2 overflow-y-auto'>
          {!selected ? (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <FolderOpen size={28} className='text-slate-300 mb-3' />
              <p className='text-sm text-[#64748B]'>Select a location from the hierarchy to view details.</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {/* Header */}
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h2 className='text-base font-semibold text-[#0F172A]'>{selected.name}</h2>
                  <p className='text-xs text-[#64748B]'>{selected.type} — {selected.path}</p>
                </div>
                <div className='flex items-center gap-1'>
                  <button onClick={() => { setRenaming(selected); setNewName(selected.name); setModal('rename'); }} aria-label='Rename' className='p-1.5 rounded-lg text-[#64748B] hover:bg-teal-50 hover:text-[#0D9488] transition-colors'><Edit3 size={15} /></button>
                  <button onClick={() => handleDelete(selected)} aria-label='Delete' className='p-1.5 rounded-lg text-[#64748B] hover:bg-red-50 hover:text-[#DC2626] transition-colors'><Trash2 size={15} /></button>
                </div>
              </div>
              {/* Compartment: occupants + compat preview */}
              {selected.type === 'COMPARTMENT' && <CompartmentDetail selected={selected} reagents={reagents} allLocs={locs} />}
              {/* Non-compartment: add child inline */}
              {selected.type !== 'COMPARTMENT' && nextType && (
                <div className='pt-2 border-t border-[#E2E8F0]'>
                  <p className='text-xs text-[#64748B] mb-2'>Add a {nextType.toLowerCase()} inside {selected.name}:</p>
                  <div className='flex gap-2'>
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={'New ' + nextType.toLowerCase() + ' name'} className='flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300' onKeyDown={e => e.key === 'Enter' && handleAdd()} />
                    <button onClick={handleAdd} className='px-3 py-2 bg-[#0D9488] text-white text-sm rounded-lg hover:bg-[#0F766E] transition-colors'>Add</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add location modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title={'Add ' + (nextType || 'Location')}>
        <div className='space-y-3'>
          <p className='text-sm text-[#64748B]'>{selected ? 'Adding inside: ' + selected.name : 'Adding a top-level Laboratory'}</p>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder='Location name' className='w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300' />
          <div className='flex justify-end gap-2'><button onClick={() => setModal(null)} className='px-4 py-2 text-sm text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50'>Cancel</button><button onClick={handleAdd} className='px-4 py-2 text-sm bg-[#0D9488] text-white rounded-lg hover:bg-[#0F766E]'>Create</button></div>
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal open={modal === 'rename'} onClose={() => { setModal(null); setRenaming(null); }} title='Rename Location'>
        <div className='space-y-3'>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} className='w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300' />
          <div className='flex justify-end gap-2'><button onClick={() => { setModal(null); setRenaming(null); }} className='px-4 py-2 text-sm text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50'>Cancel</button><button onClick={handleRename} className='px-4 py-2 text-sm bg-[#0D9488] text-white rounded-lg hover:bg-[#0F766E]'>Save</button></div>
        </div>
      </Modal>
    </div>
  );
}
