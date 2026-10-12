import { Download, FileText } from 'lucide-react';
import { useState } from 'react';
import Toast from '../components/ui/Toast';
import { downloadCSV, exportLocationsCSV, exportReagentsCSV } from '../services/dataService';
export default function Reports() {
  const [toast, setToast] = useState(null);
  function showToast(m) { setToast({ type: 'success', message: m }); setTimeout(() => setToast(null), 3000); }
  function dlReagents() { const ts = new Date().toISOString().slice(0,19).replace('T','_').replace(/:/g,'-'); downloadCSV(exportReagentsCSV(), 'chemguard_inventory_' + ts + '.csv'); showToast('Inventory CSV downloaded.'); }
  function dlLocations() { const ts = new Date().toISOString().slice(0,19).replace('T','_').replace(/:/g,'-'); downloadCSV(exportLocationsCSV(), 'chemguard_storage_' + ts + '.csv'); showToast('Storage CSV downloaded.'); }
  return (
    <div className='max-w-2xl space-y-5'>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div className='bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800'>These reports contain local demo data only. They are not official safety certifications or compliance documents.</div>
      <div className='bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-3'>
        <div className='flex items-start gap-3'><div className='p-2.5 rounded-lg bg-teal-50'><FileText size={20} className='text-[#0D9488]' /></div><div><h2 className='text-sm font-semibold text-[#0F172A]'>Reagent Inventory Report</h2><p className='text-xs text-[#64748B] mt-0.5'>All active reagents with CAS numbers, quantities, hazard classes, and SDS status.</p></div></div>
        <button onClick={dlReagents} className='flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white text-sm rounded-lg hover:bg-[#0F766E] transition-colors'><Download size={15} /> Download CSV</button>
      </div>
      <div className='bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-3'>
        <div className='flex items-start gap-3'><div className='p-2.5 rounded-lg bg-teal-50'><FileText size={20} className='text-[#0D9488]' /></div><div><h2 className='text-sm font-semibold text-[#0F172A]'>Storage Location Summary</h2><p className='text-xs text-[#64748B] mt-0.5'>All registered laboratories, cabinets, and compartments.</p></div></div>
        <button onClick={dlLocations} className='flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white text-sm rounded-lg hover:bg-[#0F766E] transition-colors'><Download size={15} /> Download CSV</button>
      </div>
      <div className='bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-3'>
        <div className='flex items-start gap-3'><div className='p-2.5 rounded-lg bg-slate-100'><FileText size={20} className='text-slate-400' /></div><div><h2 className='text-sm font-semibold text-[#0F172A]'>Safety Summary Report</h2><p className='text-xs text-[#64748B] mt-0.5'>Requires backend connection for alert and compatibility data.</p></div></div>
        <button disabled className='flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-500 text-sm rounded-lg cursor-not-allowed'><Download size={15} /> Unavailable — backend required</button>
      </div>
    </div>
  );
}
