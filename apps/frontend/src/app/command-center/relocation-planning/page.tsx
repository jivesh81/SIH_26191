"use client";

import { RelocationPlanningView } from "@/components/views/RelocationPlanningView";
import { useView } from "@/context/ViewContext";

export default function RelocationPlanningPage() {
  const { currentView } = useView();
  const activeItem = {
    label: "Relocation Planning",
    description: "Capacity & site assignment",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-extrabold text-slate-900 tracking-tight">
            {activeItem.label}
          </h1>
          <p className="text-body-lg text-slate-600 mt-1">
            {activeItem.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="status-badge status-badge-active flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
            LIVE
          </span>
        </div>
      </div>

      <RelocationPlanningView />
    </div>
  );
}
