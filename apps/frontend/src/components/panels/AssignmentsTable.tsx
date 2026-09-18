"use client";

import { useAssignments } from "@/hooks/useApi";
import { DataTable, Badge } from "@/components/ui";

export function AssignmentsTable() {
  const { data: assignments, isLoading, error } = useAssignments();

  const columns = [
    {
      key: "priority",
      header: "Priority",
      accessor: (a: any) => a.priority_rank ?? "—",
      align: "center" as const,
      width: "80px",
      monospace: true,
    },
    {
      key: "habitation",
      header: "Habitation",
      accessor: (a: any) => a.habitation_name ?? a.habitation_id ?? "Unknown",
    },
    {
      key: "population",
      header: "Population",
      accessor: (a: any) => Number(a.population ?? a.households ?? 0).toLocaleString(),
      align: "right" as const,
      width: "120px",
      monospace: true,
    },
    {
      key: "site",
      header: "Assigned Site",
      accessor: (a: any) => (
        <div>
          <span className="font-medium text-slate-900">{a.assigned_site_name ?? "—"}</span>
          <span className="text-xs text-slate-500 ml-2 font-mono">({a.assigned_site_id ?? "—"})</span>
        </div>
      ),
    },
    {
      key: "routeStatus",
      header: "Route Status",
      accessor: (a: any) => {
        const routeStatusRaw = String(a.route_status ?? "unknown").toLowerCase();
        const isFeasible = routeStatusRaw === "feasible" || routeStatusRaw === "open";
        const routeId = a.route_id ?? null;
        const statusLabel = routeId ?? "No route";
        const variant = isFeasible ? "success" : "danger";
        const dotColor = isFeasible ? "bg-green-500" : "bg-red-500";
        return (
          <Badge variant={variant} size="sm" dot dotColor={dotColor}>
            {statusLabel}
          </Badge>
        );
      },
      align: "center" as const,
      width: "140px",
    },
    {
      key: "distance",
      header: "Distance (km)",
      accessor: (a: any) => {
        const distance = a.distance_km != null ? Number(a.distance_km) : null;
        return distance !== null ? `${distance.toFixed(1)}` : "—";
      },
      align: "right" as const,
      width: "100px",
      monospace: true,
    },
    {
      key: "siteRemaining",
      header: "Site Remaining",
      accessor: (a: any) => {
        const siteRemaining = a.site_remaining_capacity != null ? Number(a.site_remaining_capacity) : null;
        if (siteRemaining === null) return <span className="text-xs text-slate-500">—</span>;
        const color = siteRemaining < 0 ? "text-red-600" : siteRemaining < 50 ? "text-amber-600" : "text-green-600";
        return <span className={`font-mono tabular-nums ${color}`}>{siteRemaining.toLocaleString()}</span>;
      },
      align: "right" as const,
      width: "120px",
    },
  ];

  if (isLoading) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l4-4m-4 4l4 4m-6 11V7a2 2 0 012-2h6a2 2 0 012 2v11a2 2 0 01-2 2h-4m-4 0H9m4 0a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v3.5" />
            </svg>
            Relocation Assignments
          </h3>
          <Badge variant="active" size="sm" dot dotColor="bg-green-500">LOADING</Badge>
        </div>
        <DataTable
          columns={columns}
          data={[{}, {}, {}] as any[]}
          keyAccessor={() => ""}
          loading
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5 bg-red-50 border-red-200">
        <div className="flex items-center gap-2 text-red-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Failed to load assignments</span>
        </div>
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-lg font-semibold text-slate-900 mb-2">No Active Assignments</p>
        <p className="text-sm text-slate-500">Run optimization or trigger a disaster event to generate a relocation plan.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l4-4m-4 4l4 4m-6 11V7a2 2 0 012-2h6a2 2 0 012 2v11a2 2 0 01-2 2h-4m-4 0H9m4 0a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v3.5" />
          </svg>
          Relocation Assignments
        </h3>
        <div className="flex items-center gap-3">
          <Badge variant="neutral" size="sm">{assignments.length} assignments</Badge>
          <Badge variant="neutral" size="sm">Sorted by priority</Badge>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={assignments}
        keyAccessor={(a: any) => `${a.habitation_id ?? a.habitation_name}-${a.assigned_site_id}`}
      />
    </div>
  );
}