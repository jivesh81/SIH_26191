"use client";

import { useKPIs } from "@/hooks/useApi";
import { Badge } from "@/components/ui";

export function KPIPanel() {
  const {
    vulnerablePopulation,
    totalEffectiveCapacity,
    assignedPopulation,
    unmetPopulation,
    activePlanVersion,
    activePlanStatus,
    isLoading,
    error,
  } = useKPIs();

  const kpis = [
    {
      label: "Vulnerable Population",
      value: vulnerablePopulation?.toLocaleString() ?? "—",
      trend: "Live from backend",
      status: "info" as const,
    },
    {
      label: "Effective Capacity",
      value: totalEffectiveCapacity?.toLocaleString() ?? "—",
      trend:
        totalEffectiveCapacity && vulnerablePopulation
          ? `${Math.round((totalEffectiveCapacity / vulnerablePopulation) * 100)}% coverage`
          : "Live from backend",
      status: "success" as const,
    },
    {
      label: "Assigned Population",
      value: assignedPopulation?.toLocaleString() ?? "—",
      trend: activePlanVersion ? `Plan v${activePlanVersion}` : "No active plan",
      status: "info" as const,
    },
    {
      label: "Unmet Population",
      value: unmetPopulation?.toLocaleString() ?? "—",
      trend:
        unmetPopulation && unmetPopulation > 0 ? "Requires attention" : "Fully covered",
      status: unmetPopulation && unmetPopulation > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      label: "Active Plan Version",
      value: activePlanVersion ? `v${activePlanVersion}` : "—",
      trend: `Status: ${activePlanStatus}`,
      status: "info" as const,
    },
    {
      label: "Plan Status",
      value: activePlanStatus?.toUpperCase() ?? "—",
      trend: "Auto-refresh: 5s",
      status:
        activePlanStatus === "active"
          ? ("success" as const)
          : activePlanStatus === "invalid"
          ? ("danger" as const)
          : ("neutral" as const),
    },
  ];

  if (isLoading) {
    return (
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Key Metrics
          </h3>
          <Badge variant="active" size="sm" dot dotColor="bg-green-500">
            LIVE
          </Badge>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-10 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5 bg-red-50 border-red-200">
        <div className="flex items-center gap-2 text-red-700">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>Failed to load KPIs</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Key Metrics
        </h3>
        <Badge variant="active" size="sm" dot dotColor="bg-green-500">
          LIVE
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="card p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-2">
              <Badge variant={kpi.status} size="sm" className="whitespace-nowrap">
                {kpi.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums mb-2">{kpi.value}</p>
            <p className="text-xs text-slate-500">{kpi.trend}</p>
          </div>
        ))}
      </div>
    </div>
  );
}