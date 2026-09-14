'use client';

import { useState, useMemo } from 'react';
import { useSiteCapacities } from '@/hooks/useApi';

function getUtilizationColor(allocated: number, max: number) {
  if (max <= 0) return 'bg-slate-400';
  const pct = (allocated / max) * 100;
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-green-500';
}

function getUtilizationBadgeClass(allocated: number, max: number) {
  if (allocated >= max) return 'badge-red';
  if (allocated > max * 0.8) return 'badge-amber';
  return 'badge-green';
}

function getSiteCardClass(simulatedOverload: boolean | undefined, selected: boolean) {
  if (simulatedOverload) return 'border-red-300 bg-red-50 ring-1 ring-red-200';
  if (selected) return 'border-blue-300 bg-blue-50 ring-1 ring-blue-200';
  return 'border-slate-200 hover:border-blue-300';
}

function getRemainingTextClass(remaining: number) {
  return remaining < 0 ? 'text-red-600' : 'text-green-600';
}

function getAlternativeCardClass(canFit: boolean) {
  return canFit ? 'border-green-300 bg-green-50' : 'border-slate-200';
}

function getSimulationResultClass(overloaded: boolean) {
  return overloaded ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50';
}

export function SiteCapacityPanel() {
  const {
    data: siteCapacities,
    isLoading,
    error,
  } = useSiteCapacities();

  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [additionalPeople, setAdditionalPeople] = useState(100);
  const [simulation, setSimulation] = useState<{
    siteId: string;
    projectedOccupancy: number;
    overloaded: boolean;
  } | null>(null);
  const [acceptedRecommendation, setAcceptedRecommendation] = useState<string | null>(null);

  const selectedSite = siteCapacities?.find((site: any) => site.site_id === selectedSiteId) ?? null;
  const projectedOccupancy = simulation?.siteId === selectedSiteId ? simulation?.projectedOccupancy : 0;

  const alternatives = useMemo(() => {
    if (!siteCapacities || !simulation?.overloaded) return [];
    return siteCapacities
      .filter((site: any) => site.site_id !== simulation.siteId)
      .map((site: any) => {
        const remaining = Number(site.remaining_capacity ?? 0);
        const max = Number(site.max_capacity ?? 0);
        const allocated = Number(site.allocated_population ?? 0);
        const utilization = max > 0 ? (allocated / max) * 100 : 0;
        return { ...site, remaining, max, allocated, utilization, canFit: remaining >= additionalPeople };
      })
      .sort((a: any, b: any) => {
        if (a.canFit !== b.canFit) return a.canFit ? -1 : 1;
        return b.remaining - a.remaining;
      })
      .slice(0, 3);
  }, [siteCapacities, simulation, additionalPeople]);

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            Site Capacities
          </h3>
          <span className="status-badge status-badge-active text-xs">LOADING</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse card rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="h-6 bg-slate-200 rounded w-48" />
                <div className="h-6 bg-slate-200 rounded w-32" />
              </div>
              <div className="h-3 bg-slate-200 rounded mt-2" />
              <div className="flex justify-between text-xs mt-2">
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="h-4 bg-slate-200 rounded w-24" />
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
          <span>Failed to load site capacities</span>
        </div>
      </div>
    );
  }

  if (!siteCapacities || siteCapacities.length === 0) {
    return (
      <div className="card-elevated rounded-xl p-8 text-center">
        <div className="text-5xl mb-3">🏕️</div>
        <p className="text-lg font-semibold text-slate-900 mb-2">No Site Capacity Data</p>
        <p className="text-sm text-slate-500">No relocation site data available from backend.</p>
      </div>
    );
  }

  const handleSimulate = () => {
    if (!selectedSite) return;
    const allocated = Number(selectedSite.allocated_population ?? 0);
    const max = Number(selectedSite.max_capacity ?? 0);
    const extra = Math.max(1, Number(additionalPeople) || 1);
    const projected = allocated + extra;
    setSimulation({ siteId: selectedSite.site_id, projectedOccupancy: projected, overloaded: projected > max });
    setAcceptedRecommendation(null);
  };

  const handleUseRecommendation = (siteId: string) => {
    setAcceptedRecommendation(siteId);
  };

  const renderSiteRow = (site: any) => {
    const allocated = Number(site.allocated_population ?? 0);
    const max = Number(site.max_capacity ?? 0);
    const remaining = Number(site.remaining_capacity ?? 0);
    const utilizationPct = max > 0 ? Math.round((allocated / max) * 100) : 0;
    const simulatedOverload = simulation?.siteId === site.site_id && simulation?.overloaded;
    const selected = selectedSiteId === site.site_id;

    return (
      <div
        key={site.site_id}
        className={'card rounded-lg p-4 transition-all duration-200 relative overflow-hidden ' + getSiteCardClass(simulatedOverload, selected)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-medium text-slate-900 truncate">{site.site_name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{site.site_id}</span>
          </div>
          <span className={'badge ' + getUtilizationBadgeClass(allocated, max)}>
            {utilizationPct}% utilized
          </span>
        </div>

        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden mb-3">
          <div
            className={'h-full rounded-full transition-all duration-500 ' + getUtilizationColor(allocated, max)}
            style={{ width: Math.min(Math.max(utilizationPct, 0), 100) + '%' }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Allocated: <span className="text-slate-900 font-mono tabular-nums">{allocated.toLocaleString()}</span></span>
          <span>Remaining: <span className={'font-mono tabular-nums ' + getRemainingTextClass(remaining)}>{remaining.toLocaleString()}</span></span>
          <span>Max: <span className="text-slate-900 font-mono tabular-nums">{max.toLocaleString()}</span></span>
        </div>

        {simulatedOverload && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="text-xs font-semibold text-red-700 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              OVER CAPACITY
            </div>
            <div className="text-xs text-red-600 mt-1">
              Projected occupancy: {projectedOccupancy.toLocaleString()} / {max.toLocaleString()}
            </div>
          </div>
        )}

        {site.assigned_habitations && site.assigned_habitations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <span className="text-xs text-slate-500">Assigned: </span>
            <span className="text-xs text-slate-600 font-mono">{site.assigned_habitations.join(', ')}</span>
          </div>
        )}
      </div>
    );
  };

  const renderSimulationResult = () => {
    if (!simulation || !selectedSite) return null;

    const overloaded = simulation.overloaded;

    if (overloaded) {
      return (
        <div className={'card rounded-lg p-4 ' + getSimulationResultClass(overloaded)}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="text-sm font-semibold text-red-700">Site cannot accommodate this population</div>
              <div className="text-xs text-red-600 mt-0.5">
                Capacity exceeded by {(simulation.projectedOccupancy - Number(selectedSite.max_capacity ?? 0)).toLocaleString()} people.
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 mb-3">Recommended alternative sites</div>
            {alternatives.length === 0 ? (
              <div className="text-xs text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
                No alternative site currently has enough remaining capacity.
              </div>
            ) : (
              <div className="space-y-3">
                {alternatives.map((alternative: any, index: number) => (
                  <div key={alternative.site_id} className={'card rounded-lg p-3 ' + getAlternativeCardClass(alternative.canFit)}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          <span className="text-blue-600 font-bold">{index + 1}.</span>
                          {alternative.site_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Remaining: <span className="font-semibold text-slate-900">{alternative.remaining.toLocaleString()}</span>
                          <span className="text-slate-400 ml-2">| Utilization: {alternative.utilization.toFixed(0)}%</span>
                        </div>
                      </div>
                      {alternative.canFit && (
                        <span className="badge-green whitespace-nowrap">BEST OPTION</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUseRecommendation(alternative.site_id)}
                      className="w-full py-2 rounded-lg font-semibold text-sm btn-primary"
                    >
                      Use Recommended Site
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {acceptedRecommendation && (
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="text-xs font-semibold text-blue-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Alternative site selected
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {siteCapacities.find((site: any) => site.site_id === acceptedRecommendation)?.site_name ?? acceptedRecommendation}
              </div>
              <div className="text-[10px] text-blue-600 mt-1">
                Demo state updated. Final relocation assignment remains subject to authority approval.
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={'card rounded-lg p-4 ' + getSimulationResultClass(overloaded)}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="text-sm font-semibold text-green-700">Capacity available</div>
            <div className="text-xs text-green-600">
              Projected occupancy: {simulation.projectedOccupancy.toLocaleString()} / {Number(selectedSite.max_capacity ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card-elevated rounded-xl p-5 space-y-6 animate-fade-in">
      {/* Current site capacities */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            Site Capacities ({siteCapacities.length})
          </h3>
          <span className="text-xs text-slate-500">Live from backend</span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
          {siteCapacities.map(renderSiteRow)}
        </div>
      </div>

      {/* Shelter what-if */}
      <div className="border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Shelter What-If</h4>
            <p className="text-xs text-slate-500 mt-0.5">Test what happens when more people arrive at a relocation site.</p>
          </div>
          <span className="badge-blue">SIMULATION</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Select relocation site</label>
            <select
              value={selectedSiteId}
              onChange={(e) => {
                setSelectedSiteId(e.target.value);
                setSimulation(null);
                setAcceptedRecommendation(null);
              }}
              className="select-field"
            >
              <option value="">Select a site...</option>
              {siteCapacities.map((site: any) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({Number(site.available_capacity ?? 0).toLocaleString()} remaining)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Additional people arriving</label>
            <input
              type="number"
              min={1}
              step={10}
              value={additionalPeople}
              onChange={(e) => setAdditionalPeople(Math.max(1, Number(e.target.value) || 1))}
              className="input-field"
            />
          </div>

          <button
            type="button"
            disabled={!selectedSiteId}
            onClick={handleSimulate}
            className="w-full py-3 px-4 rounded-lg font-semibold text-sm btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Simulate Capacity Change
          </button>

          {renderSimulationResult()}
        </div>
      </div>
    </div>
  );
}