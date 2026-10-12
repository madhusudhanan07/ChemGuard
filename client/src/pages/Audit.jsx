import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { getAuditLog } from '../services/dataService';
const EVENT_TYPES = ['','REAGENT_CREATE','REAGENT_EDIT','REAGENT_ARCHIVE','REAGENT_RESTORE','LOCATION_CREATE','LOCATION_DELETE','LOCATION_RENAME'];
export default function Audit() {
  const [filter, setFilter] = useState('');
  const entries = getAuditLog(filter || undefined);
  return (
    <div className='space-y-5'>
      <div className='bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800'>These are local demo records only. They are not compliance-grade audit logs. A backend-connected audit log will be available after Firebase integration.</div>
      <div className='flex items-center gap-3'>
        <select value={filter} onChange={e => setFilter(e.target.value)} className='px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:outline-none'>
          <option value=''>All event types</option>{EVENT_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
        </select>
      </div>
      <div className='bg-white rounded-xl border border-[#E2E8F0] overflow-hidden'>
        {entries.length === 0 ? (
          <div className='py-16 text-center'><ScrollText size={28} className='text-slate-300 mx-auto mb-3' /><p className='text-sm text-[#64748B]'>No audit records yet. Perform inventory or storage actions to generate entries.</p></div>
        ) : (
          <div className='overflow-x-auto'><table className='w-full text-sm'>
            <thead><tr className='border-b border-[#E2E8F0] bg-slate-50'>{['Timestamp','Event','Summary'].map(h => <th key={h} className='px-4 py-3 text-xs font-medium text-[#64748B] uppercase tracking-wide text-left whitespace-nowrap'>{h}</th>)}</tr></thead>
            <tbody className='divide-y divide-[#E2E8F0]'>{entries.map(e => (
              <tr key={e.id} className='hover:bg-slate-50 transition-colors'>
                <td className='px-4 py-3 text-xs text-[#64748B] whitespace-nowrap'>{new Date(e.timestamp).toLocaleString()}</td>
                <td className='px-4 py-3'><span className='inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200'>{(e.eventType || '').replace(/_/g,' ')}</span></td>
                <td className='px-4 py-3 text-[#0F172A]'>{e.summary}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
