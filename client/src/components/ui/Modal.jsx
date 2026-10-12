import { X } from 'lucide-react';
import { useEffect } from 'react';
export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' role='dialog' aria-modal='true'>
      <div className='absolute inset-0 bg-black/40' onClick={onClose} aria-hidden='true' />
      <div className='relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]'>
          <h2 className='text-base font-semibold text-[#0F172A]'>{title}</h2>
          <button onClick={onClose} aria-label='Close' className='p-1 rounded-lg text-[#64748B] hover:bg-slate-100 transition-colors'><X size={18} /></button>
        </div>
        <div className='flex-1 overflow-y-auto px-6 py-4'>{children}</div>
        {footer && <div className='px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-2'>{footer}</div>}
      </div>
    </div>
  );
}
