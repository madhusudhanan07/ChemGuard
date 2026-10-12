import { Activity, ChevronLeft, ChevronRight, ClipboardList, FileText, FlaskConical, LayoutDashboard, ScrollText, ShieldAlert, Warehouse } from "lucide-react";
import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/inventory",     icon: FlaskConical,    label: "Reagent Inventory" },
  { to: "/storage",       icon: Warehouse,       label: "Storage Manager" },
  { to: "/compatibility", icon: Activity,        label: "Compatibility Checker" },
  { to: "/alerts",        icon: ShieldAlert,     label: "Safety Alerts" },
  { to: "/audit",         icon: ScrollText,      label: "Audit Log" },
  { to: "/reports",       icon: FileText,        label: "Reports" },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`flex flex-col bg-white border-r border-[#E2E8F0] transition-all duration-200 ${collapsed ? "w-16" : "w-60"} min-h-screen shrink-0`}>
      <div className="flex items-center h-16 px-4 border-b border-[#E2E8F0] gap-2.5 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-[#0D9488] flex items-center justify-center shrink-0">
          <ClipboardList size={16} className="text-white" />
        </div>
        {!collapsed && <span className="font-semibold text-[#0F172A] text-sm tracking-tight whitespace-nowrap">ChemGuard</span>}
      </div>
      <nav className="flex-1 py-3 overflow-y-auto" aria-label="Main navigation">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} aria-label={label}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm transition-colors ${isActive ? "bg-teal-50 text-[#0D9488] font-medium" : "text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]"}`
            }>
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-[#E2E8F0]">
        <button onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] transition-colors">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
