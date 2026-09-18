"use client";

import {
  useActivePlan,
  useAssignments,
  useSiteCapacities,
  useOptimization,
} from "@/hooks/useApi";
import { useState } from "react";
import { Card, Badge, Button, DataTable } from "@/components/ui";

function getUtilizationColor(allocated: number, max: number) {
  if (max <= 0) return "bg-slate-400";
  const pct = (allocated / max) * 100;
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-green-500";
}

function getWaterClass(s: any) { return s.water_available ? "w-2 h-2 rounded bg-blue-500" : "w-2 h-2 rounded bg-slate-300"; }
function getPowerClass(s: any) { return s.power_available ? "w-2 h-2 rounded bg-amber-500" : "w-2 h-2 rounded bg-slate-300"; }
function getInfraClass(s: any) { return s.infrastructure_ready ? "w-2 h-2 rounded bg-green-500" : "w-2 h-2 rounded bg-slate-300"; }
function getPlanStatusClass(plan: any) { return plan.status === "active" ? "w-2 h-2 rounded-full bg-green-500" : plan.status === "invalid" ? "w-2 h-2 rounded-full bg-red-500" : "w-2 h-2 rounded-full bg-slate-400"; }
function getRemainingClass(remaining: number) { return remaining < 0 ? "font-mono tabular-nums text-red-600" : "font-mono tabular-nums text-green-600"; }

export function RelocationPlanningView() {
  const { data: activePlan, isLoading: planLoading } = useActivePlan();
  const { data: assignmentsData, isLoading: assignmentsLoading } = useAssignments();
  const { data: siteCapacities, isLoading: capacitiesLoading } = useSiteCapacities();
  const optimization = useOptimization();

  const [optimizing, setOptimizing] = useState(false);

  const plan = activePlan?.plan;
  const assignments = assignmentsData ?? [];
  const sites = siteCapacities ?? [];

  const handleRunOptimization = async () => {
    setOptimizing(true);
    try {
      await optimization.mutateAsync({});
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      setOptimizing(false);
    }
  };

  if (planLoading || assignmentsLoading || capacitiesLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Relocation Planning</h2>
        </div>
        <div className="space-y-6">
          <div className="animate-pulse card min-h-[120px]" />
          <div className="animate-pulse card min-h-[300px]" />
        </div>
      </div>
    );
  }

  const assignmentColumns = [
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
      accessor: (a: any) => a.habitation_name,
    },
    {
      key: "population",
      header: "Population",
      accessor: (a: any) => a.population?.toLocaleString() ?? "—",
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
      accessor: (a: any) => a.distance_km?.toFixed(1) ?? "—",
      align: "right" as const,
      width: "120px",
      monospace: true,
    },
    {
      key: "time",
      header: "Time (min)",
      accessor: (a: any) => a.travel_time_min?.toFixed(0) ?? "—",
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
        return <span className={"font-mono tabular-nums " + color}>{siteRemaining.toLocaleString()}</span>;
      },
      align: "right" as const,
      width: "130px",
    },
  ];

  const siteColumns = [
    {
      key: "name",
      header: "Site",
      accessor: (s: any) => (
        <div>
          <span className="font-medium text-slate-900">{s.site_name}</span>
          <span className="text-[10px] font-mono text-slate-500 ml-2">({s.site_id})</span>
        </div>
      ),
    },
    {
      key: "suitability",
      header: "Suitability",
      accessor: (s: any) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: Math.min(s.suitability_score * 100, 100) + "%", background: "linear-gradient(90deg, #ef4444, #f97316, #fbbf24, #22c55e)" }} />
          </div>
          <span className="text-sm font-semibold text-slate-900 font-mono">{s.suitability_score.toFixed(2)}</span>
        </div>
      ),
      align: "center" as const,
      width: "180px",
    },
    {
      key: "maxCapacity",
      header: "Max Capacity",
      accessor: (s: any) => (s.max_capacity ?? 0).toLocaleString(),
      align: "right" as const,
      width: "120px",
      monospace: true,
    },
    {
      key: "available",
      header: "Available",
      accessor: (s: any) => (s.available_capacity ?? 0).toLocaleString(),
      align: "right" as const,
      width: "120px",
      monospace: true,
    },
    {
      key: "utilization",
      header: "Utilization",
      accessor: (s: any) => {
        const allocated = Number(s.allocated_population ?? 0);
        const max = Number(s.max_capacity ?? 0);
        const utilization = max > 0 ? (allocated / max) * 100 : 0;
        const utilColor = utilization >= 90 ? "text-red-600" : utilization >= 70 ? "text-amber-600" : "text-green-600";
        return (
          <div className="flex items-center gap-2 justify-center">
            <div className="flex-1 max-w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: Math.min(utilization, 100) + "%", background: getUtilizationColor(allocated, max) }} />
            </div>
            <span className={"text-xs font-semibold font-mono " + utilColor}>{utilization.toFixed(0)}%</span>
          </div>
        );
      },
      align: "center" as const,
      width: "160px",
    },
    {
      key: "elevation",
      header: "Elevation (m)",
      accessor: (s: any) => s.elevation_m?.toLocaleString() ?? "—",
      align: "right" as const,
      width: "120px",
      monospace: true,
    },
    {
      key: "floodRisk",
      header: "Flood Risk",
      accessor: (s: any) => {
        const risk = s.flood_risk?.toLowerCase();
        let variant: "danger" | "warning" | "success" = "success";
        if (risk?.includes("high") || risk === "red") variant = "danger";
        else if (risk?.includes("medium") || risk === "orange") variant = "warning";
        return <Badge variant={variant} size="sm" className="whitespace-nowrap">{s.flood_risk ?? "Unknown"}</Badge>;
      },
      align: "center" as const,
      width: "120px",
    },
    {
      key: "infrastructure",
      header: "Infrastructure",
      accessor: (s: any) => (
        <div className="flex items-center gap-2 justify-center">
          <span className={getWaterClass(s)} title="Water" />
          <span className={getPowerClass(s)} title="Power" />
          <span className={getInfraClass(s)} title="Infra Ready" />
        </div>
      ),
      align: "center" as const,
      width: "140px",
    },
    {
      key: "roadAccess",
      header: "Access",
      accessor: (s: any) => (
        <Badge variant={s.road_access ? "success" : "danger"} size="sm" className="whitespace-nowrap">
          {s.road_access ? "Road Access" : "No Road Access"}
        </Badge>
      ),
      align: "center" as const,
      width: "130px",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Relocation Planning</h2>
          <p className="text-sm text-slate-500 mt-1">CP-SAT optimization with greedy fallback - Capacity constraints - Route feasibility integration</p>
        </div>
        <Button
          variant="primary"
          disabled={optimizing || optimization.isPending}
          onClick={handleRunOptimization}
          leftIcon={optimizing || optimization.isPending ? (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        >
          {optimizing || optimization.isPending ? "Optimizing..." : "Run Optimization"}
        </Button>
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Active Plan
        </h3>
        {!plan ? (
          <Card className="p-8 text-center">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Plan</h3>
            <p className="text-sm text-slate-500">Run optimization or simulate an event to generate a relocation plan.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-500">Plan Version</div>
              <div className="text-xl font-extrabold text-slate-900">v{plan.version}</div>
            </Card>
            <Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-500">Status</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={getPlanStatusClass(plan)} />
                <span className="text-sm font-medium text-slate-900 capitalize">{plan.status}</span>
              </div>
            </Card>
            <Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-500">Assigned Population</div>
              <div className="text-xl font-extrabold text-slate-900">{plan.total_assigned_population?.toLocaleString() ?? 0}</div>
            </Card>
            <Card variant="outlined" className="p-4">
              <div className="text-xs text-slate-500">Unmet Population</div>
              <div className="text-xl font-extrabold text-red-600">{plan.total_unmet_population?.toLocaleString() ?? 0}</div>
            </Card>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Habitation Assignments ({assignments.length})
          </h3>
          {assignments.length === 0 && <span className="text-xs text-slate-500">Run optimization to generate assignments</span>}
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-lg font-semibold text-slate-900 mb-2">No Assignments</p>
            <p className="text-sm text-slate-500">Run optimization to generate a relocation plan with habitation-to-site assignments.</p>
            <Button variant="primary" mt-4 onClick={handleRunOptimization} disabled={optimizing || optimization.isPending}>
              Run Optimization
            </Button>
          </div>
        ) : (
          <DataTable columns={assignmentColumns} data={assignments.slice(0, 100)} keyAccessor={(a: any) => a.habitation_id + "-" + a.assigned_site_id} />
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          Site Capacities ({sites.length})
        </h3>

        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
          {siteCapacities?.map((site: any) => {
            const allocated = Number(site.current_allocation ?? 0);
            const max = Number(site.max_capacity ?? 0);
            const remaining = Number(site.available_capacity ?? 0);
            const utilizationPct = max > 0 ? Math.round((allocated / max) * 100) : 0;

            return (
              <Card variant="outlined" key={site.id} className="p-4 transition-all hover:border-blue-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-slate-900 truncate">{site.name}</span>
                    <Badge variant="neutral" size="sm" className="font-mono">{site.id}</Badge>
                  </div>
                  <Badge
                    variant={utilizationPct >= 90 ? "danger" : utilizationPct >= 70 ? "warning" : "success"}
                    size="sm"
                  >
                    {utilizationPct}% utilized
                  </Badge>
                </div>

                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden mb-3">
                  <div className={"h-full rounded-full transition-all duration-500 " + getUtilizationColor(allocated, max)} style={{ width: Math.min(Math.max(utilizationPct, 0), 100) + "%" }} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Allocated: <span className="text-slate-900 font-mono tabular-nums">{allocated.toLocaleString()}</span></span>
                  <span>Remaining: <span className={getRemainingClass(remaining)}>{remaining.toLocaleString()}</span></span>
                  <span>Max: <span className="text-slate-900 font-mono tabular-nums">{max.toLocaleString()}</span></span>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}