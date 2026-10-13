import { Menu, User } from 'lucide-react';
export default function TopBar({ title, description, onMenuToggle }) {
  return (
    <header className='h-16 bg-white border-b border-[#E2E8F0] flex items-center px-6 gap-4 shrink-0'>
      <button onClick={onMenuToggle} aria-label='Toggle navigation' className='lg:hidden p-1.5 rounded-lg text-[#64748B] hover:bg-slate-50 transition-colors'><Menu size={20} /></button>
      <div className='flex-1 min-w-0'>
        <h1 className='text-base font-semibold text-[#0F172A] leading-tight'>{title}</h1>
        {description && <p className='text-xs text-[#64748B] leading-tight'>{description}</p>}
      </div>
      <span className='text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-md font-medium hidden sm:inline'>Local Dev</span>
      <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] cursor-default' title='Local Development - Authentication pending'>
        <User size={15} />
        <span className='hidden md:inline text-xs'>Auth Pending</span>
      </div>
    </header>
  );
}
