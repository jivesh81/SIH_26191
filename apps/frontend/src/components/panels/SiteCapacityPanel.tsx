"use client";

import { useState, useMemo } from "react";
import { useSiteCapacities } from "@/hooks/useApi";
import { Button, Badge, Card, Input } from "@/components/ui";

function getUtilizationColor(allocated: number, max: number) {
  if (max <= 0) return "bg-slate-400";
  const pct = (allocated / max) * 100;
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-green-500";
}

function getUtilizationBadgeVariant(allocated: number, max: number) {
  if (max <= 0) return "neutral";
  const pct = (allocated / max) * 100;
  if (pct >= 90) return "danger";
  if (pct >= 70) return "warning";
  return "success";
}

function getRemainingTextClass(remaining: number) {
  return remaining < 0 ? "text-red-600" : "text-green-600";
}

export function SiteCapacityPanel() {
  const { data: siteCapacities, isLoading, error } = useSiteCapacities();

  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [additionalPeople, setAdditionalPeople] = useState(100);
  const [simulation, setSimulation] = useState<{
    siteId: string;
    projectedOccupancy: number;
    overloaded: boolean;
  } | null>(null);
  const [acceptedRecommendation, setAcceptedRecommendation] = useState<string | null>(null);

  const selectedSite =
    siteCapacities?.find((site: any) => site.site_id === selectedSiteId) ?? null;
  const projectedOccupancy =
    simulation?.siteId === selectedSiteId ? simulation?.projectedOccupancy : 0;

  const alternatives = useMemo(() => {
    if (!siteCapacities || !simulation?.overloaded) return [];
    return siteCapacities
      .filter((site: any) => site.site_id !== simulation.siteId)
      .map((site: any) => {
        const remaining = Number(site.remaining_capacity ?? 0);
        const max = Number(site.max_capacity ?? 0);
        const allocated = Number(site.allocated_population ?? 0);
        const utilization = max > 0 ? (allocated / max) * 100 : 0;
        return {
          ...site,
          remaining,
          max,
          allocated,
          utilization,
          canFit: remaining >= additionalPeople,
        };
      })
      .sort((a: any, b: any) => {
        if (a.canFit !== b.canFit) return a.canFit ? -1 : 1;
        return b.remaining - a.remaining;
      })
      .slice(0, 3);
  }, [siteCapacities, simulation, additionalPeople]);

  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            Site Capacities
          </h3>
          <Badge variant="active" size="sm" dot dotColor="bg-green-500">LOADING</Badge>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
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
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" className="p-5 bg-red-50 border-red-200">
        <div className="flex items-center gap-2 text-red-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Failed to load site capacities</span>
        </div>
      </Card>
    );
  }

  if (!siteCapacities || siteCapacities.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-5xl mb-3">🏕️</div>
        <p className="text-lg font-semibold text-slate-900 mb-2">No Site Capacity Data</p>
        <p className="text-sm text-slate-500">No relocation site data available from backend.</p>
      </Card>
    );
  }

  const handleSimulate = () => {
    if (!selectedSite) return;
    const allocated = Number(selectedSite.allocated_population ?? 0);
    const max = Number(selectedSite.max_capacity ?? 0);
    const extra = Math.max(1, Number(additionalPeople) || 1);
    const projected = allocated + extra;
    setSimulation({
      siteId: selectedSite.site_id,
      projectedOccupancy: projected,
      overloaded: projected > max,
    });
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

    const borderClass = simulatedOverload
      ? "border-red-300 bg-red-50"
      : selected
      ? "border-blue-300 bg-blue-50"
      : "border-slate-200 hover:border-blue-300";

    return (
      <Card variant="outlined" className={`p-4 transition-all duration-200 ${borderClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-medium text-slate-900 truncate">{site.site_name}</span>
            <Badge variant="neutral" size="sm" className="font-mono">{site.site_id}</Badge>
          </div>
          <Badge
            variant={getUtilizationBadgeVariant(allocated, max)}
            size="sm"
          >
            {utilizationPct}% utilized
          </Badge>
        </div>

        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getUtilizationColor(allocated, max)}`}
            style={{ width: `${Math.min(Math.max(utilizationPct, 0), 100)}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Allocated: <span className="text-slate-900 font-mono tabular-nums">{allocated.toLocaleString()}</span>
          </span>
          <span>
            Remaining: <span className={`font-mono tabular-nums ${getRemainingTextClass(remaining)}`}>{remaining.toLocaleString()}</span>
          </span>
          <span>
            Max: <span className="text-slate-900 font-mono tabular-nums">{max.toLocaleString()}</span>
          </span>
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
            <span className="text-xs text-slate-600 font-mono">{site.assigned_habitations.join(", ")}</span>
          </div>
        )}
      </Card>
    );
  };

  const renderSimulationResult = () => {
    if (!simulation || !selectedSite) return null;

    const overloaded = simulation.overloaded;

    if (overloaded) {
      return (
        <Card variant="outlined" className="p-4 border-red-200 bg-red-50">
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
                  <Card
                    key={alternative.site_id}
                    variant="outlined"
                    className={`p-3 ${alternative.canFit ? "border-green-300 bg-green-50" : "border-slate-200"}`}
                  >
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
                        <Badge variant="success" size="sm">BEST OPTION</Badge>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleUseRecommendation(alternative.site_id)}
                    >
                      Use Recommended Site
                    </Button>
                  </Card>
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
        </Card>
      );
    }

    return (
      <Card variant="outlined" className="p-4 border-green-200 bg-green-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="text-sm font-semibold text-green-700">Capacity available</div>
            <div className="text-xs text-green-600">
              Projected occupancy: {simulation.projectedOccupancy.toLocaleString()} / {Number(selectedSite.max_capacity ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Card className="p-5 space-y-6">
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

      <div className="border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Shelter What-If</h4>
            <p className="text-xs text-slate-500 mt-0.5">Test what happens when more people arrive at a relocation site.</p>
          </div>
          <Badge variant="info" size="sm">SIMULATION</Badge>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Select relocation site</label>
            <select
              value={selectedSiteId}
              onChange={(e) => {
                setSelectedSiteId(e.target.value);
                setSimulation(null);
                setAcceptedRecommendation(null);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a site...</option>
              {siteCapacities.map((site: any) => (
                <option key={site.site_id} value={site.site_id}>
                  {site.site_name} ({Number(site.remaining_capacity ?? 0).toLocaleString()} remaining)
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Additional people arriving"
              type="number"
              min={1}
              step={10}
              value={additionalPeople}
              onChange={(e) => setAdditionalPeople(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <Button
            variant="primary"
            fullWidth
            disabled={!selectedSiteId}
            onClick={handleSimulate}
          >
            Simulate Capacity Change
          </Button>

          {renderSimulationResult()}
        </div>
      </div>
    </Card>
  );
}