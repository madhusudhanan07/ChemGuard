import { AlertTriangle, FileQuestion, FlaskConical, RefreshCw, Warehouse } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import { dashboardApi } from '../services/apiService';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const nav = useNavigate();

  async function refresh() {
    setLoading(true); setError(null);
    try {
      const data = await dashboardApi.summary();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
      setStats(null); // Never show zeros as genuine counts on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <p className='text-sm text-[#64748B]'>Live data from Firebase Cloud Firestore.</p>
        <button onClick={refresh} disabled={loading} className='flex items-center gap-1.5 text-xs text-[#0D9488] hover:underline disabled:opacity-50'><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {loading ? 'Loading…' : 'Refresh'}</button>
      </div>
      {error && (
        <div className='bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800'>
          <strong>Could not load dashboard data.</strong> {error} — Verify the backend is running at http://127.0.0.1:5000
        </div>
      )}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <StatCard icon={FlaskConical} label='Active Reagents' value={loading ? '…' : (error ? 'Error' : stats?.active ?? 0)} status={error ? 'danger' : 'neutral'} />
        <StatCard icon={Warehouse} label='Storage Locations' value={loading ? '…' : (error ? 'Error' : stats?.locations ?? 0)} status={error ? 'danger' : 'neutral'} />
        <StatCard icon={AlertTriangle} label='Unresolved Alerts' value={loading ? '…' : (error ? 'Error' : stats?.openAlerts ?? 0)} status={error ? 'danger' : (stats?.openAlerts > 0 ? 'danger' : 'neutral')} />
        <StatCard icon={FileQuestion} label='Missing / Unverified SDS' value={loading ? '…' : (error ? 'Error' : stats?.missingSds ?? 0)} status={error ? 'danger' : (stats?.missingSds > 0 ? 'warning' : 'neutral')} />
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <div className='bg-white rounded-xl border border-[#E2E8F0] p-5'>
          <h2 className='text-sm font-semibold text-[#0F172A] mb-3'>Recent Activity</h2>
          {loading ? (<p className='text-sm text-[#94A3B8] text-center py-8'>Loading…</p>) : error ? (<p className='text-sm text-red-600 text-center py-8'>Could not load recent activity.</p>) : stats?.recentAudit?.length > 0 ? (
            <ul className='divide-y divide-[#E2E8F0]'>{stats.recentAudit.map((e, i) => (
              <li key={e.id || i} className='py-2.5 flex items-start gap-3'>
                <span className='w-2 h-2 rounded-full bg-[#0D9488] mt-1.5 shrink-0' />
                <div className='min-w-0'>
                  <p className='text-sm text-[#0F172A] truncate'>{e.summary}</p>
                  <p className='text-xs text-[#94A3B8]'>{e.timestamp ? new Date(e.timestamp._seconds ? e.timestamp._seconds * 1000 : e.timestamp).toLocaleString() : ''}</p>
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
        <strong>Safety notice:</strong> Chemical compatibility verification is unavailable until the verified backend engine is implemented. Storage assignments are blocked.
      </div>
    </div>
  );
}
