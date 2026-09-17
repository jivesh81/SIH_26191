"use client";

import { useView, VIEW_CONFIG, ViewName } from "@/context/ViewContext";

export function NavigationSidebar() {
  const { currentView, setCurrentView } = useView();

  const views: ViewName[] = [
    "overview",
    "risk-intelligence",
    "relocation-planning",
    "disaster-simulation",
    "map-intelligence",
    "alerts-telecom",
    "plan-approvals",
  ];

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <span className="text-white font-bold text-lg">AS</span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Aapda Setu</div>
            <div className="text-[10px] text-slate-500">
              Disaster Command Center
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {views.map((view) => {
          const config = VIEW_CONFIG[view];
          const isActive = currentView === view;
          return (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-lg">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-medium text-sm ${isActive ? "" : "truncate"}`}
                >
                  {config.label}
                </div>
                <div
                  className={`text-[10px] truncate ${isActive ? "text-slate-300" : "text-slate-400"}`}
                >
                  {config.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer status */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>API Connected</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          Barpeta, Assam · Demo Data
        </div>
      </div>
    </aside>
  );
}
