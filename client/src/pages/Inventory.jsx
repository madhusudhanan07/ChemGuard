import { Archive, Edit2, FlaskConical, PlusCircle, RotateCcw, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import Toast from '../components/ui/Toast';
import { archiveReagent, createReagent, getReagents, restoreReagent, updateReagent } from '../services/dataService';

const GHS = ['Flammable','Oxidizer','Explosive','Corrosive','Toxic','Harmful','Irritant','Environmental Hazard','Compressed Gas','Health Hazard'];
const CAS_RE = /^\d{2,7}-\d{2}-\d{1}$/;
const EMPTY = { containerId:'', chemicalName:'', casNumber:'', concentration:'', concentrationUnit:'', quantityOnHand:'', quantityUnit:'mL', hazardClasses:[], sdsStatus:'MISSING', sdsReference:'', notes:'' };

function validate(f) {
  const e = {};
  if (!f.containerId.trim()) e.containerId = 'Required';
  if (!f.chemicalName.trim()) e.chemicalName = 'Required';
  if (!f.casNumber.trim()) e.casNumber = 'Required';
  else if (!CAS_RE.test(f.casNumber.trim())) e.casNumber = 'Format: e.g. 64-19-7 (2-7 digits, dash, 2 digits, dash, 1 digit)';
  if (f.concentration !== 'UNKNOWN' && f.concentration !== '') { const n = Number(f.concentration); if (isNaN(n) || n <= 0) e.concentration = 'Must be a positive number or check UNKNOWN'; }
  if (f.concentration !== 'UNKNOWN' && f.concentration !== '' && !f.concentrationUnit.trim()) e.concentrationUnit = 'Required with numeric concentration';
  if (f.quantityOnHand === '' || isNaN(Number(f.quantityOnHand)) || Number(f.quantityOnHand) < 0) e.quantityOnHand = 'Must be a non-negative number';
  if (!f.quantityUnit.trim()) e.quantityUnit = 'Required';
  if (!f.hazardClasses || f.hazardClasses.length === 0) e.hazardClasses = 'Select at least one, or tick UNKNOWN';
  if ((f.sdsStatus === 'VERIFIED' || f.sdsStatus === 'UNVERIFIED') && !f.sdsReference.trim()) e.sdsReference = 'Required unless SDS is MISSING';
  return e;
}

function Field({ label, error, children }) {
  return (<div><label className='block text-xs font-medium text-[#0F172A] mb-1'>{label}</label>{children}{error && <p className='text-xs text-[#DC2626] mt-0.5'>{error}</p>}</div>);
}

function ReagentForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY });
  const [errors, setErrors] = useState({});
  const [unknownConc, setUnknownConc] = useState(!initial ? false : initial.concentration === 'UNKNOWN');
  const [unknownHaz, setUnknownHaz] = useState(!initial ? false : Array.isArray(initial.hazardClasses) && initial.hazardClasses[0] === 'UNKNOWN');
  const inp = 'w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-[#0D9488]';
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function toggleHaz(h) { setForm(f => { const cur = (f.hazardClasses || []).filter(x => x !== 'UNKNOWN'); return { ...f, hazardClasses: cur.includes(h) ? cur.filter(x => x !== h) : [...cur, h] }; }); }
  function submit() {
    const f = { ...form, casNumber: (form.casNumber || '').trim() };
    if (unknownConc) { f.concentration = 'UNKNOWN'; f.concentrationUnit = ''; }
    if (unknownHaz)  { f.hazardClasses = ['UNKNOWN']; }
    const errs = validate(f);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(f);
  }
  return (
    <div className='space-y-3'>
      <Field label='Container ID *' error={errors.containerId}><input className={inp} value={form.containerId} onChange={e => set('containerId', e.target.value)} placeholder='e.g. BTL-ACOH-001' /></Field>
      <div className='grid grid-cols-2 gap-3'>
        <Field label='Chemical Name *' error={errors.chemicalName}><input className={inp} value={form.chemicalName} onChange={e => set('chemicalName', e.target.value)} /></Field>
        <Field label='CAS Number *' error={errors.casNumber}><input className={inp} value={form.casNumber} onChange={e => set('casNumber', e.target.value)} placeholder='e.g. 64-19-7' /></Field>
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <Field label='Concentration *' error={errors.concentration}>
          <div className='flex gap-2 items-center'>
            <input className={inp + ' flex-1'} disabled={unknownConc} value={unknownConc ? '' : form.concentration} onChange={e => set('concentration', e.target.value)} placeholder='e.g. 99.5' />
            <label className='flex items-center gap-1 text-xs text-[#64748B] whitespace-nowrap cursor-pointer'><input type='checkbox' checked={unknownConc} onChange={e => setUnknownConc(e.target.checked)} className='rounded' /> UNKNOWN</label>
          </div>
        </Field>
        <Field label='Conc. Unit' error={errors.concentrationUnit}><input className={inp} disabled={unknownConc} value={form.concentrationUnit} onChange={e => set('concentrationUnit', e.target.value)} placeholder='e.g. % w/v' /></Field>
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <Field label='Quantity *' error={errors.quantityOnHand}><input className={inp} type='number' min='0' step='any' value={form.quantityOnHand} onChange={e => set('quantityOnHand', e.target.value)} /></Field>
        <Field label='Unit *' error={errors.quantityUnit}><input className={inp} value={form.quantityUnit} onChange={e => set('quantityUnit', e.target.value)} placeholder='mL' /></Field>
      </div>
      <Field label='Hazard Classes *' error={errors.hazardClasses}>
        <div className='flex flex-wrap gap-1.5 mb-1'>{GHS.map(h => (<button key={h} type='button' onClick={() => { setUnknownHaz(false); toggleHaz(h); }} className={'px-2 py-0.5 text-xs rounded-md border transition-colors ' + (!unknownHaz && (form.hazardClasses||[]).includes(h) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-teal-400')}>{h}</button>))}</div>
        <label className='flex items-center gap-1.5 text-xs text-[#64748B] cursor-pointer'><input type='checkbox' checked={unknownHaz} onChange={e => { setUnknownHaz(e.target.checked); if (e.target.checked) setForm(f => ({ ...f, hazardClasses: [] })); }} className='rounded' /> Mark as UNKNOWN (hazard data not yet confirmed)</label>
      </Field>
      <Field label='SDS Status *' error={errors.sdsStatus}>
        <select className={inp + ' bg-white'} value={form.sdsStatus} onChange={e => set('sdsStatus', e.target.value)}><option value='MISSING'>MISSING</option><option value='UNVERIFIED'>UNVERIFIED</option></select>
        <p className='text-xs text-[#94A3B8] mt-0.5'>VERIFIED status requires Administrator access (available after backend connection).</p>
      </Field>
      {form.sdsStatus !== 'MISSING' && <Field label='SDS Reference *' error={errors.sdsReference}><input className={inp} value={form.sdsReference} onChange={e => set('sdsReference', e.target.value)} placeholder='https://...' /></Field>}
      <Field label='Notes (optional)' error={null}><textarea className={inp} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
      <div className='flex justify-end gap-2 pt-2'>
        <button onClick={onCancel} className='px-4 py-2 text-sm text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50'>Cancel</button>
        <button onClick={submit} className='px-4 py-2 text-sm bg-[#0D9488] text-white rounded-lg hover:bg-[#0F766E] transition-colors'>Save Reagent</button>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [reagents, setReagents] = useState([]);
  const [search, setSearch] = useState('');
  const [sdsFilter, setSdsFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  function load() { setReagents(getReagents({ search, archivedOnly: showArchived })); }
  useEffect(() => { load(); }, [search, showArchived]);
  function showToast(type, msg) { clearTimeout(timer.current); setToast({ type, message: msg }); timer.current = setTimeout(() => setToast(null), 3500); }
  const shown = sdsFilter ? reagents.filter(r => r.sdsStatus === sdsFilter) : reagents;
  function handleSave(fields) {
    const res = editing ? updateReagent(editing.reagentId, fields) : createReagent(fields);
    if (!res.ok) { showToast('error', res.error); return; }
    showToast('success', editing ? 'Reagent updated.' : 'Reagent added.'); setModal(null); setEditing(null); load();
  }
  return (
    <div className='space-y-5'>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='relative'><Search size={15} className='absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]' /><input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search name or CAS…' className='pl-8 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 w-52' /></div>
          <select value={sdsFilter} onChange={e => setSdsFilter(e.target.value)} className='px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:outline-none'><option value=''>All SDS</option><option value='MISSING'>MISSING</option><option value='UNVERIFIED'>UNVERIFIED</option><option value='VERIFIED'>VERIFIED</option></select>
          <label className='flex items-center gap-1.5 text-sm text-[#64748B] cursor-pointer'><input type='checkbox' checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className='rounded' /> Archived</label>
        </div>
        <button onClick={() => { setEditing(null); setModal('form'); }} className='flex items-center gap-1.5 px-4 py-2 bg-[#0D9488] text-white text-sm font-medium rounded-lg hover:bg-[#0F766E] transition-colors'><PlusCircle size={16} /> Add Reagent</button>
      </div>
      <div className='bg-white rounded-xl border border-[#E2E8F0] overflow-hidden'>
        {shown.length === 0 ? (<div className='py-16 text-center'><FlaskConical size={28} className='text-slate-300 mx-auto mb-3' /><p className='text-sm text-[#64748B]'>{search ? 'No reagents match your search.' : 'No reagents yet. Click Add Reagent to begin.'}</p></div>) : (
          <div className='overflow-x-auto'><table className='w-full text-sm'>
            <thead><tr className='border-b border-[#E2E8F0] bg-slate-50'>{['Container ID','Chemical Name','CAS','Concentration','Quantity','SDS','Actions'].map(h => <th key={h} className='px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wide text-left whitespace-nowrap'>{h}</th>)}</tr></thead>
            <tbody className='divide-y divide-[#E2E8F0]'>{shown.map(r => (
              <tr key={r.reagentId} className='hover:bg-slate-50 transition-colors'>
                <td className='px-4 py-3 font-mono text-xs text-[#64748B]'>{r.containerId}</td>
                <td className='px-4 py-3 font-medium text-[#0F172A]'>{r.chemicalName}</td>
                <td className='px-4 py-3 font-mono text-xs'>{r.casNumber}</td>
                <td className='px-4 py-3 text-[#64748B]'>{r.concentration === 'UNKNOWN' ? 'UNKNOWN' : r.concentration + ' ' + (r.concentrationUnit || '')}</td>
                <td className='px-4 py-3 text-[#64748B]'>{r.quantityOnHand} {r.quantityUnit}</td>
                <td className='px-4 py-3'><StatusBadge status={r.sdsStatus} /></td>
                <td className='px-4 py-3'><div className='flex items-center gap-2'>
                  <button onClick={() => { setEditing(r); setModal('form'); }} aria-label='Edit' className='p-1.5 rounded-lg text-[#64748B] hover:bg-teal-50 hover:text-[#0D9488] transition-colors'><Edit2 size={14} /></button>
                  {r.archived ? <button onClick={() => { const res = restoreReagent(r.reagentId); showToast(res.ok ? 'success' : 'error', res.ok ? 'Restored.' : res.error); load(); }} aria-label='Restore' className='p-1.5 rounded-lg text-[#64748B] hover:bg-green-50 hover:text-[#16A34A] transition-colors'><RotateCcw size={14} /></button> : <button onClick={() => { const res = archiveReagent(r.reagentId); showToast(res.ok ? 'success' : 'error', res.ok ? 'Archived.' : res.error); load(); }} aria-label='Archive' className='p-1.5 rounded-lg text-[#64748B] hover:bg-amber-50 hover:text-[#D97706] transition-colors'><Archive size={14} /></button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      <Modal open={modal === 'form'} onClose={() => { setModal(null); setEditing(null); }} title={editing ? 'Edit Reagent' : 'Add Reagent'}>
        <ReagentForm initial={editing} onSave={handleSave} onCancel={() => { setModal(null); setEditing(null); }} />
      </Modal>
    </div>
  );
}
