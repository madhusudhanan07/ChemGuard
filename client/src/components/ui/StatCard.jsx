export default function StatCard({ icon: Icon, label, value, status = "neutral", note }) {
  const clr = { neutral:"text-[#0D9488]", warning:"text-[#D97706]", danger:"text-[#DC2626]", success:"text-[#16A34A]" };
  const bg  = { neutral:"bg-teal-50",     warning:"bg-amber-50",     danger:"bg-red-50",      success:"bg-green-50" };
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${bg[status]} shrink-0`}><Icon size={20} className={clr[status]} /></div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-[#0F172A] mt-0.5">{value}</p>
        {note && <p className="text-xs text-[#94A3B8] mt-0.5">{note}</p>}
      </div>
    </div>
  );
}
