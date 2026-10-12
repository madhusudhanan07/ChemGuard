import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import StatusBadge from '../components/ui/StatusBadge';
import { getAlerts } from '../services/dataService';
const STATUSES = ['', 'OPEN', 'PENDING_REVIEW', 'CLOSED'];
export default function Alerts() {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const all = getAlerts(filter || undefined);
  const shown = search ? all.filter(a => (a.reagentAName || '').toLowerCase().includes(search.toLowerCase()) || (a.ruleDescription || '').toLowerCase().includes(search.toLowerCase())) : all;
  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-center gap-3'>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search alerts…' className='px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300 w-48' />
        <select value={filter} onChange={e => setFilter(e.target.value)} className='px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:outline-none'>
          <option value=''>All statuses</option><option value='OPEN'>OPEN</option><option value='PENDING_REVIEW'>PENDING_REVIEW</option><option value='CLOSED'>CLOSED</option>
        </select>
      </div>
      {shown.length === 0 ? (
        <div className='bg-white rounded-xl border border-[#E2E8F0] py-16 text-center'>
          <ShieldAlert size={28} className='text-slate-300 mx-auto mb-3' />
          <p className='text-sm text-[#64748B]'>No safety alerts recorded.</p>
          <p className='text-xs text-[#94A3B8] mt-1'>Alerts are created automatically when incompatible storage assignments are attempted after the backend is connected.</p>
        </div>
      ) : (
        <div className='space-y-3'>{shown.map(a => (
          <div key={a.alertId} className='bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-2'>
            <div className='flex items-start justify-between gap-3'>
              <div><p className='text-sm font-semibold text-[#0F172A]'>{a.alertType} — {a.reagentAName || 'Unknown reagent'}</p>{a.reagentBName && <p className='text-xs text-[#64748B]'>vs {a.reagentBName}</p>}</div>
              <StatusBadge status={a.status} />
            </div>
            {a.ruleDescription && <p className='text-xs text-[#64748B]'>{a.ruleDescription}</p>}
            {a.sourceTitle && <p className='text-xs text-[#94A3B8]'>Source: {a.sourceTitle}</p>}
            <p className='text-xs text-[#94A3B8]'>{new Date(a.createdAt).toLocaleString()}</p>
          </div>
        ))}</div>
      )}
    </div>
  );
}
