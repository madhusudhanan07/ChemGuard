import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
const ICON = { success: CheckCircle, warning: AlertTriangle, error: XCircle };
const STYLE = { success: 'bg-green-50 border-green-200 text-green-800', warning: 'bg-amber-50 border-amber-200 text-amber-800', error: 'bg-red-50 border-red-200 text-red-800' };
export default function Toast({ type = 'success', message, onClose }) {
  const Icon = ICON[type] || CheckCircle;
  return (
    <div className={'fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-xl border shadow-md max-w-sm ' + (STYLE[type] || STYLE.success)} role='alert'>
      <Icon size={18} className='shrink-0 mt-0.5' />
      <p className='text-sm flex-1'>{message}</p>
      <button onClick={onClose} aria-label='Dismiss' className='shrink-0 hover:opacity-70'><X size={16} /></button>
    </div>
  );
}
