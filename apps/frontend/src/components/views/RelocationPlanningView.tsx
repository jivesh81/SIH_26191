"use client";

import {
  useActivePlan,
  useAssignments,
  useSiteCapacities,
  useOptimization,
} from "@/hooks/useApi";
import { useState } from "react";

function getUtilizationColor(utilizationPct: number, max: number) {
  if (max <= 0) return "bg-slate-400";
  if (utilizationPct >= 90) return "bg-red-500";
  if (utilizationPct >= 70) return "bg-amber-500";
  return "bg-green-500";
}

function PlanStatusContent({ plan }: { plan: any }) {
  if (!plan) {
    return (
      <div className="card-elevated rounded-xl p-8 text-center">
        <div className="text-5xl mb-3">📋</div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          No Active Plan
        </h3>
        <p className="text-sm text-slate-500">
          Run optimization or simulate an event to generate a relocation plan.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card rounded-xl p-4">
        <div className="text-xs text-slate-500">Plan Version</div>
        <div className="text-xl font-extrabold text-slate-900">
          v{plan.version}
        </div>
      </div>
      <div className="card rounded-xl p-4">
        <div className="text-xs text-slate-500">Status</div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`w-2 h-2 rounded-full ${plan.status === "active" ? "bg-green-500" : plan.status === "invalid" ? "bg-red-500" : "bg-slate-400"}`}
          />
          <span className="text-sm font-medium text-slate-900 capitalize">
            {plan.status}
          </span>
        </div>
      </div>
      <div className="card rounded-xl p-4">
        <div className="text-xs text-slate-500">Assigned Population</div>
        <div className="text-xl font-extrabold text-slate-900">
          {plan.total_assigned_population?.toLocaleString() ?? 0}
        </div>
      </div>
      <div className="card rounded-xl p-4">
        <div className="text-xs text-slate-500">Unmet Population</div>
        <div className="text-xl font-extrabold text-red-600">
          {plan.total_unmet_population?.toLocaleString() ?? 0}
        </div>
      </div>
    </div>
  );
}

export function RelocationPlanningView() {
  const { data: activePlan, isLoading: planLoading } = useActivePlan();
  const { data: assignmentsData, isLoading: assignmentsLoading } =
    useAssignments();
  const { data: siteCapacities, isLoading: capacitiesLoading } =
    useSiteCapacities();
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
          <h2 className="text-xl font-bold text-slate-900">
            Relocation Planning
          </h2>
        </div>
        <div className="space-y-6">
          <div className="animate-pulse card-elevated rounded-xl min-h-[120px]" />
          <div className="animate-pulse card-elevated rounded-xl min-h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Relocation Planning
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            CP-SAT optimization with greedy fallback · Capacity constraints ·
            Route feasibility integration
          </p>
        </div>
        <button
          onClick={handleRunOptimization}
          disabled={optimizing || optimization.isPending}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200
            bg-gradient-to-r from-blue-600 to-cyan-600 text-white
            hover:from-blue-700 hover:to-cyan-700
            shadow-lg shadow-blue-500/30
            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {optimizing || optimization.isPending ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Optimizing...
            </>
          ) : (
            <>
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Run Optimization
            </>
          )}
        </button>
      </div>

      {/* Active Plan Status */}
      <div className="card-elevated rounded-xl p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Active Plan
        </h3>
        <PlanStatusContent plan={plan} />
      </div>

      {/* Habitation Assignments */}
      <div className="card-elevated rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Habitation Assignments ({assignments.length})
          </h3>
          {assignments.length === 0 && (
            <span className="text-xs text-slate-500">
              Run optimization to generate assignments
            </span>
          )}
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-lg font-semibold text-slate-900 mb-2">
              No Assignments
            </p>
            <p className="text-sm text-slate-500">
              Run optimization to generate a relocation plan with
              habitation-to-site assignments.
            </p>
            <button
              onClick={handleRunOptimization}
              disabled={optimizing || optimization.isPending}
              className="mt-4 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
            >
              Run Optimization
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Habitation</th>
                  <th className="px-4 py-3 w-28 tabular-nums">Population</th>
                  <th className="px-4 py-3">Assigned Site</th>
                  <th className="px-4 py-3">Route Status</th>
                  <th className="px-4 py-3 w-28 tabular-nums">Distance (km)</th>
                  <th className="px-4 py-3 w-28 tabular-nums">Time (min)</th>
                  <th className="px-4 py-3 w-28">Site Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assignments.slice(0, 100).map((a: any, idx: number) => {
                  const routeStatusRaw = String(
                    a.route_status ?? "unknown",
                  ).toLowerCase();
                  const isFeasible =
                    routeStatusRaw === "feasible" || routeStatusRaw === "open";
                  const routeStatus = isFeasible ? "feasible" : "infeasible";
                  const siteRemaining =
                    a.site_remaining_capacity != null
                      ? Number(a.site_remaining_capacity)
                      : null;

                  return (
                    <tr
                      key={a.habitation_id}
                      className={`${idx % 2 === 0 ? "bg-slate-50" : "bg-white"} hover:bg-slate-100 transition-colors`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 tabular-nums">
                        {a.priority_rank ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {a.habitation_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono tabular-nums">
                        {a.population?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-slate-900">
                            {a.assigned_site_name ?? "—"}
                          </span>
                          <span className="text-xs text-slate-500 ml-2 font-mono">
                            ({a.assigned_site_id ?? "—"})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isFeasible
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${isFeasible ? "bg-green-500" : "bg-red-500"}`}
                          />
                          {isFeasible ? "Feasible" : "Infeasible"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono tabular-nums">
                        {a.distance_km?.toFixed(1) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono tabular-nums">
                        {a.travel_time_min?.toFixed(0) ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {siteRemaining !== null ? (
                          <span
                            className={`font-mono tabular-nums ${siteRemaining < 0 ? "text-red-600" : siteRemaining < 50 ? "text-amber-600" : "text-green-600"}`}
                          >
                            {siteRemaining.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Site Capacities */}
      <div className="card-elevated rounded-xl p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
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
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
            />
          </svg>
          Site Capacities ({sites.length})
        </h3>

        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
          {siteCapacities.map((site: any) => {
            const allocated = Number(site.current_allocation ?? 0);
            const max = Number(site.max_capacity ?? 0);
            const remaining = Number(site.available_capacity ?? 0);
            const utilizationPct =
              max > 0 ? Math.round((allocated / max) * 100) : 0;

            return (
              <div
                key={site.id}
                className="card rounded-lg p-4 transition-all hover:border-blue-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-slate-900 truncate">
                      {site.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                      {site.id}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${utilizationPct >= 90 ? "bg-red-50 text-red-700 border border-red-200" : utilizationPct >= 70 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-green-50 text-green-700 border border-green-200"}`}
                  >
                    {utilizationPct}% utilized
                  </span>
                </div>

                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getUtilizationColor(utilizationPct, max)}`}
                    style={{
                      width: `${Math.min(Math.max(utilizationPct, 0), 100)}%`,
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Allocated:{" "}
                    <span className="text-slate-900 font-mono tabular-nums">
                      {allocated.toLocaleString()}
                    </span>
                  </span>
                  <span>
                    Remaining:{" "}
                    <span
                      className={`font-mono tabular-nums ${remaining < 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {remaining.toLocaleString()}
                    </span>
                  </span>
                  <span>
                    Max:{" "}
                    <span className="text-slate-900 font-mono tabular-nums">
                      {max.toLocaleString()}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
