import { ChevronRight, Edit3, FolderOpen, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import { storageApi } from '../services/apiService';

function childrenOf(all, pid) { return all.filter(l => (pid === null) ? !l.parentId : l.parentId === pid); }
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
              {hasKids && <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }} className='shrink-0 text-[#94A3B8]'><ChevronRight size={14} className={'transition-transform ' + (open ? 'rotate-90' : '')} /></button>}
              {!hasKids && <span className='w-4 shrink-0' />}
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

export default function Storage() {
  const [locs, setLocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [toast, setToast] = useState(null);

  async function refresh() {
    setLoading(true);
    try { const data = await storageApi.list(); setLocs(Array.isArray(data) ? data : []); }
    catch (err) { showToast('error', 'Could not load locations: ' + err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  function showToast(type, msg) { setToast({ type, message: msg }); setTimeout(() => setToast(null), 4000); }
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
        <div className='bg-white rounded-xl border border-[#E2E8F0] p-5 lg:col-span-1'>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-sm font-semibold text-[#0F172A]'>Location Hierarchy</h2>
            <button onClick={() => { setNewName(''); setModal('add'); }} className='flex items-center gap-1 text-xs text-[#0D9488] hover:underline'><Plus size={13} /> Add</button>
          </div>
          {loading ? (<div className='py-8 text-center'><Loader2 size={20} className='animate-spin text-[#0D9488] mx-auto' /></div>) : locs.length === 0 ? (<p className='text-sm text-[#94A3B8] text-center py-8'>No locations yet. Add a Laboratory to begin.</p>) : (<Tree all={locs} parentId={null} depth={0} onSelect={setSelected} selected={selected} />)}
        </div>
        <div className='bg-white rounded-xl border border-[#E2E8F0] p-5 lg:col-span-2'>
          {!selected ? (<div className='flex flex-col items-center justify-center py-16 text-center'><FolderOpen size={28} className='text-slate-300 mb-3' /><p className='text-sm text-[#64748B]'>Select a location from the hierarchy to view details.</p></div>) : (
            <div className='space-y-4'>
              <div className='flex items-start justify-between gap-3'>
                <div><h2 className='text-base font-semibold text-[#0F172A]'>{selected.name}</h2><p className='text-xs text-[#64748B]'>{selected.type} — {selected.path}</p></div>
                <div className='flex items-center gap-1'>
                  <button onClick={() => { setRenaming(selected); setNewName(selected.name); setModal('rename'); }} aria-label='Rename' className='p-1.5 rounded-lg text-[#64748B] hover:bg-teal-50 hover:text-[#0D9488] transition-colors'><Edit3 size={15} /></button>
                  <button onClick={() => handleDelete(selected)} aria-label='Delete' className='p-1.5 rounded-lg text-[#64748B] hover:bg-red-50 hover:text-[#DC2626] transition-colors'><Trash2 size={15} /></button>
                </div>
              </div>
              {selected.type === 'COMPARTMENT' && (<div className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'><strong>Storage assignment blocked.</strong> Reagent assignment requires the verified backend compatibility engine (Phase 5). This restriction prevents unsafe co-storage.</div>)}
              {selected.type !== 'COMPARTMENT' && nextType && (<div className='pt-2 border-t border-[#E2E8F0]'><p className='text-xs text-[#64748B] mb-2'>Add a {nextType.toLowerCase()} inside {selected.name}:</p><div className='flex gap-2'><input value={newName} onChange={e => setNewName(e.target.value)} placeholder={'New ' + nextType.toLowerCase() + ' name'} className='flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300' onKeyDown={e => e.key === 'Enter' && handleAdd()} /><button onClick={handleAdd} className='px-3 py-2 bg-[#0D9488] text-white text-sm rounded-lg hover:bg-[#0F766E] transition-colors'>Add</button></div></div>)}
            </div>
          )}
        </div>
      </div>
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title={'Add ' + (nextType || 'Location')}>
        <div className='space-y-3'><p className='text-sm text-[#64748B]'>{selected ? 'Adding inside: ' + selected.name : 'Adding a top-level Laboratory'}</p><input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder='Location name' className='w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300' /><div className='flex justify-end gap-2'><button onClick={() => setModal(null)} className='px-4 py-2 text-sm text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50'>Cancel</button><button onClick={handleAdd} className='px-4 py-2 text-sm bg-[#0D9488] text-white rounded-lg hover:bg-[#0F766E]'>Create</button></div></div>
      </Modal>
      <Modal open={modal === 'rename'} onClose={() => { setModal(null); setRenaming(null); }} title='Rename Location'>
        <div className='space-y-3'><input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} className='w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300' /><div className='flex justify-end gap-2'><button onClick={() => { setModal(null); setRenaming(null); }} className='px-4 py-2 text-sm text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50'>Cancel</button><button onClick={handleRename} className='px-4 py-2 text-sm bg-[#0D9488] text-white rounded-lg hover:bg-[#0F766E]'>Save</button></div></div>
      </Modal>
    </div>
  );
}
