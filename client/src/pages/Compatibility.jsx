import { AlertOctagon, FlaskConical, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { getLocations, getReagents } from '../services/dataService';
export default function Compatibility() {
  const reagents = getReagents();
  const compartments = getLocations().filter(l => l.type === 'COMPARTMENT');
  const [reagentId, setReagentId] = useState('');
  const [compId, setCompId] = useState('');
  const sel = reagents.find(r => r.reagentId === reagentId);
  return (
    <div className='max-w-2xl space-y-6'>
      <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3'>
        <AlertOctagon size={18} className='text-amber-600 shrink-0 mt-0.5' />
        <p className='text-sm text-amber-800'>Verified compatibility checking is unavailable until the safety engine backend is connected. No compatibility results will be generated in local demo mode. Do not make storage decisions based on this screen.</p>
      </div>
      <div className='bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4'>
        <h2 className='text-sm font-semibold text-[#0F172A]'>Select Reagent and Compartment</h2>
        <div className='space-y-3'>
          <div><label className='block text-xs font-medium text-[#0F172A] mb-1'>Reagent</label>
            <select value={reagentId} onChange={e => setReagentId(e.target.value)} className='w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300'>
              <option value=''>Select a reagent…</option>{reagents.map(r => <option key={r.reagentId} value={r.reagentId}>{r.chemicalName} ({r.casNumber})</option>)}
            </select>
          </div>
          <div><label className='block text-xs font-medium text-[#0F172A] mb-1'>Target Compartment</label>
            <select value={compId} onChange={e => setCompId(e.target.value)} className='w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300'>
              <option value=''>Select a compartment…</option>{compartments.map(c => <option key={c.locationId} value={c.locationId}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {sel && (<div className='bg-slate-50 rounded-lg p-3 text-xs space-y-1'><p><span className='font-medium'>Chemical:</span> {sel.chemicalName}</p><p><span className='font-medium'>CAS:</span> {sel.casNumber}</p><p><span className='font-medium'>SDS Status:</span> {sel.sdsStatus}</p><p><span className='font-medium'>Hazard Classes:</span> {Array.isArray(sel.hazardClasses) ? sel.hazardClasses.join(', ') : sel.hazardClasses}</p></div>)}
        <button disabled className='w-full px-4 py-2 bg-slate-200 text-slate-500 text-sm rounded-lg cursor-not-allowed'>Check Compatibility (engine not connected)</button>
      </div>
      <div className='bg-white rounded-xl border border-[#E2E8F0] p-6'>
        <h2 className='text-sm font-semibold text-[#0F172A] mb-3'>Result</h2>
        <div className='rounded-xl border border-[#E2E8F0] bg-slate-50 p-8 text-center'>
          <AlertOctagon size={28} className='text-slate-300 mx-auto mb-2' />
          <p className='text-sm text-[#64748B]'>No result. The compatibility engine is not connected.</p>
          <p className='text-xs text-[#94A3B8] mt-1'>Possible results: INCOMPATIBLE / NEEDS_REVIEW / NO_DOCUMENTED_CONFLICT</p>
        </div>
      </div>
    </div>
  );
}
