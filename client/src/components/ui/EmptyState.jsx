export default function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className='flex flex-col items-center justify-center py-16 text-center'>
      {Icon && <div className='w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4'><Icon size={26} className='text-slate-400' /></div>}
      <h3 className='text-sm font-semibold text-[#0F172A] mb-1'>{title}</h3>
      {body && <p className='text-sm text-[#64748B] max-w-xs'>{body}</p>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  );
}
