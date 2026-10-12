import { AlertTriangle, FileQuestion, FlaskConical, RefreshCw, Warehouse } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import { getDashboardStats } from '../services/dataService';
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const nav = useNavigate();
  function refresh() { setStats(getDashboardStats()); }
  useEffect(() => { refresh(); }, []);
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <p className='text-sm text-[#64748B]'>All figures are drawn from local demo storage.</p>
        <button onClick={refresh} className='flex items-center gap-1.5 text-xs text-[#0D9488] hover:underline'><RefreshCw size={13} /> Refresh</button>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <StatCard icon={FlaskConical} label='Active Reagents' value={stats ? stats.active : '—'} status='neutral' />
        <StatCard icon={Warehouse} label='Storage Compartments' value={stats ? stats.compartments : '—'} status='neutral' />
        <StatCard icon={AlertTriangle} label='Unresolved Alerts' value={stats ? stats.openAlerts : '—'} status={stats && stats.openAlerts > 0 ? 'danger' : 'neutral'} />
        <StatCard icon={FileQuestion} label='Missing / Unverified SDS' value={stats ? stats.missingSds : '—'} status={stats && stats.missingSds > 0 ? 'warning' : 'neutral'} />
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <div className='bg-white rounded-xl border border-[#E2E8F0] p-5'>
          <h2 className='text-sm font-semibold text-[#0F172A] mb-3'>Recent Activity</h2>
          {stats && stats.recentAudit && stats.recentAudit.length > 0 ? (
            <ul className='divide-y divide-[#E2E8F0]'>{stats.recentAudit.map(e => (
              <li key={e.id} className='py-2.5 flex items-start gap-3'>
                <span className='w-2 h-2 rounded-full bg-[#0D9488] mt-1.5 shrink-0' />
                <div className='min-w-0'>
                  <p className='text-sm text-[#0F172A] truncate'>{e.summary}</p>
                  <p className='text-xs text-[#94A3B8]'>{new Date(e.timestamp).toLocaleString()}</p>
                </div>
              </li>
            ))}</ul>
          ) : (<p className='text-sm text-[#94A3B8] text-center py-8'>No activity recorded yet.</p>)}
        </div>
        <div className='bg-white rounded-xl border border-[#E2E8F0] p-5'>
          <h2 className='text-sm font-semibold text-[#0F172A] mb-3'>Quick Actions</h2>
          <div className='grid grid-cols-2 gap-3'>
            <button onClick={() => nav('/inventory')} className='rounded-xl px-4 py-3 text-sm font-medium bg-teal-50 text-[#0D9488] hover:bg-teal-100 transition-colors text-left'>Add Reagent</button>
            <button onClick={() => nav('/storage')} className='rounded-xl px-4 py-3 text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-left'>Manage Storage</button>
            <button onClick={() => nav('/alerts')} className='rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-[#DC2626] hover:bg-red-100 transition-colors text-left'>View Alerts</button>
            <button onClick={() => nav('/reports')} className='rounded-xl px-4 py-3 text-sm font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors text-left'>Download Reports</button>
          </div>
        </div>
      </div>
      <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800'>
        <strong>Safety notice:</strong> Chemical compatibility verification is unavailable until the verified backend engine is connected. Storage assignments are disabled in local demo mode.
      </div>
    </div>
  );
}
