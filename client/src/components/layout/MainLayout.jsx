import { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const META = {
  "/dashboard":     { title: "Dashboard",             description: "Laboratory safety overview" },
  "/inventory":     { title: "Reagent Inventory",     description: "Manage chemical reagent records" },
  "/storage":       { title: "Storage Manager",       description: "Laboratory, cabinet and compartment hierarchy" },
  "/compatibility": { title: "Compatibility Checker", description: "Verify chemical co-storage compatibility" },
  "/alerts":        { title: "Safety Alerts",         description: "Active warnings and review queue" },
  "/audit":         { title: "Audit Log",             description: "History of safety-relevant actions" },
  "/reports":       { title: "Reports",               description: "Inventory and safety summary exports" },
};

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const meta = META[pathname] ?? { title: "ChemGuard", description: "" };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}
      <div className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:relative z-30 lg:z-auto transition-transform duration-200`}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={meta.title} description={meta.description} onMenuToggle={() => setMobileOpen(o => !o)} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
