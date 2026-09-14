'use client';

import { KPIPanel } from '@/components/panels/KPIPanel';
import { AssignmentsTable } from '@/components/panels/AssignmentsTable';
import { SiteCapacityPanel } from '@/components/panels/SiteCapacityPanel';
import { EventControls } from '@/components/panels/EventControls';
import { PlanVersionPanel } from '@/components/panels/PlanVersionPanel';
import { useView } from '@/context/ViewContext';

export default function CommandCenterOverview() {
  const { currentView } = useView();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-md font-extrabold text-slate-900 tracking-tight">Command Center</h1>
          <p className="text-body-lg text-slate-600 mt-1">Real-time operational overview for Barpeta district disaster management</p>
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

      {/* KPI Grid */}
      <section aria-labelledby="kpi-heading" className="animate-slide-up">
        <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
        <KPIPanel />
      </section>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Assignments & Capacity */}
        <div className="lg:col-span-2 space-y-6">
          <section aria-labelledby="assignments-heading" className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <AssignmentsTable />
          </section>

          <section aria-labelledby="capacity-heading" className="animate-slide-up" style={{ animationDelay: '150ms' }}>
            <SiteCapacityPanel />
          </section>
        </div>

        {/* Right Column - Simulation & Plan */}
        <div className="space-y-6">
          <section aria-labelledby="simulation-heading" className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <EventControls />
          </section>

          <section aria-labelledby="plan-heading" className="animate-slide-up" style={{ animationDelay: '250ms' }}>
            <PlanVersionPanel />
          </section>
        </div>
      </div>
    </div>
  );
}