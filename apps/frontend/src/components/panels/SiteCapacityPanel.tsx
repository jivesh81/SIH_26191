'use client';

import { useState } from 'react';
import { useSiteCapacities } from '@/hooks/useApi';

export function SiteCapacityPanel() {
  const {
    data: siteCapacities,
    isLoading,
    error,
  } = useSiteCapacities();

  const [selectedSiteId, setSelectedSiteId] =
    useState('');

  const [additionalPeople, setAdditionalPeople] =
    useState(100);

  const [simulation, setSimulation] = useState<{
    siteId: string;
    projectedOccupancy: number;
    overloaded: boolean;
  } | null>(null);

  const [acceptedRecommendation, setAcceptedRecommendation] =
    useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Site Capacities
        </h3>

        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse h-16 bg-slate-100 rounded border border-slate-200"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Failed to load site capacities
      </div>
    );
  }

  if (
    !siteCapacities ||
    siteCapacities.length === 0
  ) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500">
        <p>No site capacity data</p>
      </div>
    );
  }

  const selectedSite =
    siteCapacities.find(
      (site: any) =>
        site.site_id === selectedSiteId
    ) ?? null;

  const projectedOccupancy =
    selectedSite && simulation
      ? simulation.projectedOccupancy
      : 0;

  /*
   * IMPORTANT:
   * This is a normal calculation, not a hook.
   * Therefore it is safe to run after the
   * loading/error early returns.
   */
  const alternatives =
    simulation?.overloaded
      ? siteCapacities
        .filter(
          (site: any) =>
            site.site_id !==
            simulation.siteId
        )
        .map((site: any) => {
          const remaining =
            Number(
              site.remaining_capacity ??
              0
            );

          const max =
            Number(
              site.max_capacity ?? 0
            );

          const allocated =
            Number(
              site.allocated_population ??
              0
            );

          const utilization =
            max > 0
              ? (allocated / max) * 100
              : 0;

          return {
            ...site,
            remaining,
            max,
            allocated,
            utilization,
            canFit:
              remaining >=
              additionalPeople,
          };
        })
        .sort(
          (a: any, b: any) => {
            if (
              a.canFit !==
              b.canFit
            ) {
              return a.canFit
                ? -1
                : 1;
            }

            return (
              b.remaining -
              a.remaining
            );
          }
        )
        .slice(0, 3)
      : [];

  const getUtilizationColor = (
    allocated: number,
    max: number
  ) => {
    if (max <= 0) {
      return 'bg-slate-500';
    }

    const pct =
      (allocated / max) * 100;

    if (pct >= 90) {
      return 'bg-red-500';
    }

    if (pct >= 70) {
      return 'bg-amber-500';
    }

    return 'bg-green-500';
  };

  const handleSimulate = () => {
    if (!selectedSite) {
      return;
    }

    const allocated =
      Number(
        selectedSite.allocated_population ??
        0
      );

    const max =
      Number(
        selectedSite.max_capacity ?? 0
      );

    const extra =
      Math.max(
        1,
        Number(additionalPeople) || 1
      );

    const projected =
      allocated + extra;

    setSimulation({
      siteId:
        selectedSite.site_id,
      projectedOccupancy:
        projected,
      overloaded:
        projected > max,
    });

    setAcceptedRecommendation(
      null
    );
  };

  const handleUseRecommendation = (
    siteId: string
  ) => {
    setAcceptedRecommendation(
      siteId
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
      {/* ---------------------------------------------------------------- */}
      {/* Current site capacities                                          */}
      {/* ---------------------------------------------------------------- */}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
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
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
            />
          </svg>

          Site Capacities (
          {siteCapacities.length})
        </h3>

        <div className="space-y-3">
          {siteCapacities.map(
            (site: any) => {
              const allocated =
                Number(
                  site.allocated_population ??
                  0
                );

              const max =
                Number(
                  site.max_capacity ??
                  0
                );

              const remaining =
                Number(
                  site.remaining_capacity ??
                  0
                );

              const utilizationPct =
                max > 0
                  ? Math.round(
                    (allocated /
                      max) *
                    100
                  )
                  : 0;

              const simulatedOverload =
                simulation?.siteId ===
                site.site_id &&
                simulation.overloaded;

              const selected =
                selectedSiteId ===
                site.site_id;

              return (
                <div
                  key={site.site_id}
                  className={`border rounded-lg p-3 bg-white transition-all ${simulatedOverload
                      ? 'border-red-400 bg-red-50/40 ring-1 ring-red-300'
                      : selected
                        ? 'border-blue-400 ring-1 ring-blue-200'
                        : 'border-slate-200'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-900 truncate">
                        {site.site_name}
                      </span>

                      <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded shrink-0">
                        {site.site_id}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${allocated >= max
                          ? 'bg-red-100 text-red-700'
                          : allocated >
                            max * 0.8
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                    >
                      {utilizationPct}% utilized
                    </span>
                  </div>

                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getUtilizationColor(
                        allocated,
                        max
                      )}`}
                      style={{
                        width: `${Math.min(
                          Math.max(
                            utilizationPct,
                            0
                          ),
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <span>
                      Allocated:{' '}
                      <span className="text-slate-700 font-mono tabular-nums">
                        {allocated.toLocaleString()}
                      </span>
                    </span>

                    <span>
                      Remaining:{' '}
                      <span className="text-slate-700 font-mono tabular-nums">
                        {remaining.toLocaleString()}
                      </span>
                    </span>

                    <span>
                      Max:{' '}
                      <span className="text-slate-700 font-mono tabular-nums">
                        {max.toLocaleString()}
                      </span>
                    </span>
                  </div>

                  {simulatedOverload && (
                    <div className="mt-2 p-2 rounded-md bg-red-100 border border-red-200">
                      <div className="text-xs font-semibold text-red-700">
                        ⚠ OVER CAPACITY
                      </div>

                      <div className="text-xs text-red-600 mt-1">
                        Projected occupancy:{' '}
                        {projectedOccupancy.toLocaleString()}
                        {' / '}
                        {max.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {site.assigned_habitations &&
                    site.assigned_habitations
                      .length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Assigned:{' '}
                        </span>

                        <span className="text-xs text-slate-700 font-mono">
                          {site.assigned_habitations.join(
                            ', '
                          )}
                        </span>
                      </div>
                    )}
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Shelter what-if                                                  */}
      {/* ---------------------------------------------------------------- */}

      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Shelter What-If
            </h4>

            <p className="text-xs text-slate-500 mt-0.5">
              Test what happens when more people arrive.
            </p>
          </div>

          <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded">
            SIMULATION
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {/* Site selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Select relocation site
            </label>

            <select
              value={selectedSiteId}
              onChange={(e) => {
                setSelectedSiteId(
                  e.target.value
                );

                setSimulation(null);

                setAcceptedRecommendation(
                  null
                );
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                Select a site...
              </option>

              {siteCapacities.map(
                (site: any) => (
                  <option
                    key={site.site_id}
                    value={site.site_id}
                  >
                    {site.site_name} (
                    {Number(
                      site.remaining_capacity ??
                      0
                    ).toLocaleString()}{' '}
                    remaining)
                  </option>
                )
              )}
            </select>
          </div>

          {/* People input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Additional people arriving
            </label>

            <input
              type="number"
              min={1}
              step={10}
              value={additionalPeople}
              onChange={(e) =>
                setAdditionalPeople(
                  Math.max(
                    1,
                    Number(
                      e.target.value
                    ) || 1
                  )
                )
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Simulate */}
          <button
            type="button"
            disabled={!selectedSite}
            onClick={handleSimulate}
            className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Simulate Capacity Change
          </button>

          {/* Result */}
          {simulation &&
            selectedSite && (
              <div
                className={`rounded-lg border p-3 ${simulation.overloaded
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                  }`}
              >
                {simulation.overloaded ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        ⚠️
                      </span>

                      <div>
                        <div className="text-sm font-semibold text-red-700">
                          Site cannot accommodate this population
                        </div>

                        <div className="text-xs text-red-600 mt-0.5">
                          Capacity exceeded by{' '}
                          {(
                            simulation.projectedOccupancy -
                            Number(
                              selectedSite.max_capacity ??
                              0
                            )
                          ).toLocaleString()}{' '}
                          people.
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-slate-700 mb-2">
                        Recommended alternative sites
                      </div>

                      {alternatives.length ===
                        0 ? (
                        <div className="text-xs text-red-600">
                          No alternative site currently has enough remaining capacity.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {alternatives.map(
                            (
                              alternative: any,
                              index: number
                            ) => (
                              <div
                                key={
                                  alternative.site_id
                                }
                                className={`bg-white rounded-lg border p-2.5 ${alternative.canFit
                                    ? 'border-green-200'
                                    : 'border-slate-200'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-900">
                                      {index +
                                        1}
                                      .{' '}
                                      {
                                        alternative.site_name
                                      }
                                    </div>

                                    <div className="text-xs text-slate-500 mt-0.5">
                                      Remaining:{' '}
                                      <span className="font-semibold text-slate-700">
                                        {alternative.remaining.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  {alternative.canFit && (
                                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                                      BEST OPTION
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUseRecommendation(
                                      alternative.site_id
                                    )
                                  }
                                  className="mt-2 w-full py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                                >
                                  Use Recommended Site
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {acceptedRecommendation && (
                      <div className="mt-3 p-2 rounded-md bg-blue-50 border border-blue-200">
                        <div className="text-xs font-semibold text-blue-700">
                          ✓ Alternative site selected
                        </div>

                        <div className="text-xs text-blue-600 mt-0.5">
                          {siteCapacities.find(
                            (site: any) =>
                              site.site_id ===
                              acceptedRecommendation
                          )?.site_name ??
                            acceptedRecommendation}
                        </div>

                        <div className="text-[11px] text-blue-500 mt-1">
                          Demo state updated. Final relocation assignment remains subject to authority approval.
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      ✅
                    </span>

                    <div>
                      <div className="text-sm font-semibold text-green-700">
                        Capacity available
                      </div>

                      <div className="text-xs text-green-600">
                        Projected occupancy:{' '}
                        {simulation.projectedOccupancy.toLocaleString()}
                        {' / '}
                        {Number(
                          selectedSite.max_capacity ??
                          0
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}