'use client';

import { useAssignments } from '@/hooks/useApi';

export function AssignmentsTable() {
  const {
    data: assignments,
    isLoading,
    error,
  } = useAssignments();

  const routeStatusColors: Record<string, { bg: string; text: string; dot: string }> = {
    feasible: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    infeasible: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    impassable: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    blocked: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    unknown: { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400' },
    open: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    congested: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    closed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  };

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l4-4m-4 4l4 4m-6 11V7a2 2 0 012-2h6a2 2 0 012 2v11a2 2 0 01-2 2h-4m-4 0H9m4 0a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v3.5" />
            </svg>
            Relocation Assignments
          </h3>
          <span className="status-badge status-badge-active text-xs">LOADING</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse card rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="h-6 bg-slate-200 rounded w-16" />
                <div className="h-6 bg-slate-200 rounded w-48 flex-1" />
                <div className="h-6 bg-slate-200 rounded w-32" />
                <div className="h-6 bg-slate-200 rounded w-24" />
                <div className="h-6 bg-slate-200 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card rounded-xl p-5 bg-red-50 border-red-200">
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
      <div className="card-elevated rounded-xl p-8 text-center">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-lg font-semibold text-slate-900 mb-2">No Active Assignments</p>
        <p className="text-sm text-slate-500">Run optimization or trigger a disaster event to generate a relocation plan.</p>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l4-4m-4 4l4 4m-6 11V7a2 2 0 012-2h6a2 2 0 012 2v11a2 2 0 01-2 2h-4m-4 0H9m4 0a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v3.5" />
          </svg>
          Relocation Assignments
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 px-3 py-1 rounded-full bg-slate-100">
            {assignments.length} assignments
          </span>
          <span className="text-xs text-slate-500">Sorted by priority</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 w-20">Priority</th>
              <th className="px-4 py-3">Habitation</th>
              <th className="px-4 py-3 w-32 tabular-nums">Population</th>
              <th className="px-4 py-3">Assigned Site</th>
              <th className="px-4 py-3">Route Status</th>
              <th className="px-4 py-3 w-28 tabular-nums">Distance</th>
              <th className="px-4 py-3 w-28">Site Capacity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {assignments.map((a: any, idx: number) => {
              const population = Number(a.population ?? a.households ?? 0);
              const habitationName = a.habitation_name ?? a.habitation_id ?? 'Unknown habitation';
              const siteId = a.assigned_site_id ?? '—';
              const siteName = a.assigned_site_name ?? siteId;
              const routeId = a.route_id ?? null;
              const routeStatusRaw = String(a.route_status ?? 'unknown').toLowerCase();
              const routeStatus = routeStatusColors[routeStatusRaw] ? routeStatusRaw : 'unknown';
              const distance = a.distance_km != null ? Number(a.distance_km) : null;
              const siteRemaining = a.site_remaining_capacity != null ? Number(a.site_remaining_capacity) : null;

              const statusStyle = routeStatusColors[routeStatus];
              const statusLabel = routeId ?? 'No route';

              return (
                <tr
                  key={`${a.habitation_id ?? habitationName}-${siteId}-${idx}`}
                  className={`${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-slate-100 transition-colors`}
                >
                  <td className="px-4 py-3 font-mono font-bold text-blue-600 tabular-nums">
                    {a.priority_rank ?? '—'}
                  </td>

                  <td className="px-4 py-3 font-medium text-slate-900">{habitationName}</td>

                  <td className="px-4 py-3 text-slate-600 font-mono tabular-nums">{population.toLocaleString()}</td>

                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-slate-900">{siteName}</span>
                      <span className="text-xs text-slate-500 ml-2 font-mono">({siteId})</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.text}/20`}>
                      <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                      {statusLabel}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-600 font-mono tabular-nums">
                    {distance !== null ? `${distance.toFixed(1)} km` : '—'}
                  </td>

                  <td className="px-4 py-3">
                    {siteRemaining !== null ? (
                      <span className={`font-mono tabular-nums ${siteRemaining < 0 ? 'text-red-600' : siteRemaining < 50 ? 'text-amber-600' : 'text-green-600'}`}>
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
    </div>
  );
}