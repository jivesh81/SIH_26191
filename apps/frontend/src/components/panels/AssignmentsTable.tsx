'use client';

import { useAssignments } from '@/hooks/useApi';

export function AssignmentsTable() {
  const {
    data: assignments,
    isLoading,
    error,
  } = useAssignments();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200 font-medium text-slate-900">
          Relocation Assignments
        </div>

        <div className="p-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-3"
            >
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-4 bg-slate-200 rounded w-20" />
              <div className="h-4 bg-slate-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Failed to load assignments
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500">
        <div className="text-4xl mb-2">📋</div>

        <p className="font-medium">
          No active assignments
        </p>

        <p className="text-sm">
          Run optimization or trigger an event to generate a plan
        </p>
      </div>
    );
  }

  const routeStatusColors: Record<string, string> = {
    feasible:
      'bg-green-100 text-green-700',
    infeasible:
      'bg-red-100 text-red-700',
    impassable:
      'bg-red-100 text-red-700',
    blocked:
      'bg-red-100 text-red-700',
    unknown:
      'bg-slate-100 text-slate-700',
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l4-4m-4 4l4 4m-6 11V7a2 2 0 012-2h6a2 2 0 012 2v11a2 2 0 01-2 2h-4m-4 0H9m4 0a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v3.5"
            />
          </svg>

          Relocation Assignments ({assignments.length})
        </h3>

        <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded">
          Sorted by priority
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Priority
              </th>

              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Habitation
              </th>

              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Population
              </th>

              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Assigned Site
              </th>

              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Route
              </th>

              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Distance
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {assignments.map(
              (a: any, idx: number) => {
                const population = Number(
                  a.population ??
                  a.households ??
                  0
                );

                const habitationName =
                  a.habitation_name ??
                  a.habitation_id ??
                  'Unknown habitation';

                const siteId =
                  a.assigned_site_id ??
                  a.site_id ??
                  '—';

                const siteName =
                  a.assigned_site_name ??
                  a.site_name ??
                  siteId;

                const routeId =
                  a.route_id ??
                  null;

                const routeStatus =
                  String(
                    a.route_status ??
                    'unknown'
                  ).toLowerCase();

                const distance =
                  a.distance_km != null
                    ? Number(
                      a.distance_km
                    )
                    : null;

                return (
                  <tr
                    key={`${a.habitation_id ?? habitationName}-${siteId}-${idx}`}
                    className={
                      idx % 2 === 0
                        ? 'bg-white'
                        : 'bg-slate-50'
                    }
                  >
                    <td className="px-3 py-2 font-mono font-bold text-slate-700">
                      {a.priority_rank ??
                        '—'}
                    </td>

                    <td className="px-3 py-2 font-medium text-slate-900">
                      {habitationName}
                    </td>

                    <td className="px-3 py-2 text-slate-700 tabular-nums">
                      {population.toLocaleString()}
                    </td>

                    <td className="px-3 py-2 text-slate-700">
                      <span className="font-medium">
                        {siteName}
                      </span>

                      <span className="text-xs text-slate-500 ml-1">
                        ({siteId})
                      </span>
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${routeStatusColors[
                          routeStatus
                          ] ??
                          'bg-slate-100 text-slate-700'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${routeStatus ===
                              'feasible'
                              ? 'bg-green-500'
                              : routeStatus ===
                                'infeasible' ||
                                routeStatus ===
                                'impassable' ||
                                routeStatus ===
                                'blocked'
                                ? 'bg-red-500'
                                : 'bg-slate-400'
                            }`}
                        />

                        {routeId ??
                          'No route'}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-slate-700 tabular-nums">
                      {distance !== null
                        ? `${distance.toFixed(2)} km`
                        : '—'}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}