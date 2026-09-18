"use client";

import { useSites, Site } from "@/hooks/useApi";
import { useState, useMemo } from "react";
import { useMapState } from "@/context/MapStateContext";
import { Card, Badge, DataTable, Input, Select, Button } from "@/components/ui";

type SortKey = "suitability_score" | "max_capacity" | "available_capacity" | "utilization_pct" | "elevation_m" | "name";

function getUtilizationColor(allocated: number, max: number) {
  if (max <= 0) return "bg-slate-400";
  const pct = (allocated / max) * 100;
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-green-500";
}

function getFloodRiskVariant(risk: string) {
  const riskLower = risk.toLowerCase();
  if (riskLower.includes("high") || riskLower === "red") return "danger";
  if (riskLower.includes("medium") || riskLower === "orange") return "warning";
  return "success";
}

function getWaterClass(s: Site) { return s.water_available ? "w-2 h-2 rounded bg-blue-500" : "w-2 h-2 rounded bg-slate-300"; }
function getPowerClass(s: Site) { return s.power_available ? "w-2 h-2 rounded bg-amber-500" : "w-2 h-2 rounded bg-slate-300"; }
function getInfraClass(s: Site) { return s.infrastructure_ready ? "w-2 h-2 rounded bg-green-500" : "w-2 h-2 rounded bg-slate-300"; }
function getUtilizationColorClass(utilization: number) { return utilization >= 90 ? "text-red-600" : utilization >= 70 ? "text-amber-600" : "text-green-600"; }

export function RelocationSitesView() {
  const { data: sitesData, isLoading, error } = useSites(false);
  const { setSelection } = useMapState();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "suitability_score", direction: "desc" });

  const handleSiteClick = (siteId: string) => { setSelection({ selectedSiteId: siteId }); };

  const sites = sitesData?.sites ?? [];

  const getSiteValue = (site: Site, key: SortKey): number | string => {
    switch (key) {
      case "suitability_score": return site.suitability_score;
      case "max_capacity": return site.max_capacity;
      case "available_capacity": return site.available_capacity;
      case "utilization_pct": return site.utilization_pct;
      case "elevation_m": return site.elevation_m;
      case "name": return site.name;
      default: return "";
    }
  };

  const filteredAndSortedSites = useMemo(() => {
    let result = sites.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()));
    result.sort((a, b) => {
      let aVal = getSiteValue(a, sortConfig.key);
      let bVal = getSiteValue(b, sortConfig.key);
      if (aVal === null || aVal === undefined) aVal = sortConfig.direction === "asc" ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortConfig.direction === "asc" ? Infinity : -Infinity;
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [sites, searchQuery, sortConfig]);

  const totalCapacity = sites.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
  const totalAllocated = sites.reduce((sum, s) => sum + (s.current_allocation || 0), 0);
  const totalRemaining = sites.reduce((sum, s) => sum + (s.available_capacity || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Card key={i} className="p-5 animate-pulse" />)}
        </div>
        <Card className="animate-pulse min-h-[400px]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" className="p-6 text-center bg-red-50 border-red-200">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-red-600">Failed to load site data</p>
      </Card>
    );
  }

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  };

  const gradientStyle = { width: "100%", background: "linear-gradient(90deg, #ef4444, #f97316, #fbbf24, #22c55e)" };

  const columns = [
    { key: "name", header: "Site", accessor: (s: Site) => <div onClick={() => handleSiteClick(s.id)} className="cursor-pointer"><p className="font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-500 font-mono">{s.id}</p></div>, onSort: () => handleSort("name") },
    { key: "suitability", header: "Suitability", accessor: (s: Site) => <div className="flex items-center gap-2"><div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: Math.min(s.suitability_score * 100, 100) + "%", background: "linear-gradient(90deg, #ef4444, #f97316, #fbbf24, #22c55e)" }} /></div><span className="text-sm font-semibold text-slate-900 font-mono">{s.suitability_score.toFixed(2)}</span></div>, align: "center" as const, width: "180px", onSort: () => handleSort("suitability_score") },
    { key: "max_capacity", header: "Max Capacity", accessor: (s: Site) => s.max_capacity?.toLocaleString() ?? "—", align: "right" as const, width: "120px", monospace: true, onSort: () => handleSort("max_capacity") },
    { key: "available", header: "Available", accessor: (s: Site) => (s.available_capacity || 0).toLocaleString(), align: "right" as const, width: "120px", monospace: true, onSort: () => handleSort("available_capacity") },
    { key: "utilization", header: "Utilization", accessor: (s: Site) => { const allocated = s.current_allocation || 0; const max = s.max_capacity || 0; const utilization = max > 0 ? (allocated / max) * 100 : 0; const utilColor = getUtilizationColorClass(utilization); return <div className="flex items-center gap-2 justify-center"><div className="flex-1 max-w-32 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: Math.min(utilization, 100) + "%", background: getUtilizationColor(allocated, max) }} /></div><span className={"text-xs font-semibold font-mono " + utilColor}>{utilization.toFixed(0)}%</span></div>; }, align: "center" as const, width: "160px", onSort: () => handleSort("utilization_pct") },
    { key: "elevation", header: "Elevation (m)", accessor: (s: Site) => s.elevation_m?.toLocaleString() ?? "—", align: "right" as const, width: "120px", monospace: true, onSort: () => handleSort("elevation_m") },
    { key: "floodRisk", header: "Flood Risk", accessor: (s: Site) => <Badge variant={getFloodRiskVariant(s.flood_risk ?? "")} size="sm" className="whitespace-nowrap">{s.flood_risk ?? "Unknown"}</Badge>, align: "center" as const, width: "120px" },
    { key: "infrastructure", header: "Infrastructure", accessor: (s: Site) => <div className="flex items-center gap-2 justify-center"><span className={getWaterClass(s)} title="Water" /><span className={getPowerClass(s)} title="Power" /><span className={getInfraClass(s)} title="Infra Ready" /></div>, align: "center" as const, width: "140px" },
    { key: "roadAccess", header: "Access", accessor: (s: Site) => <Badge variant={s.road_access ? "success" : "danger"} size="sm" className="whitespace-nowrap">{s.road_access ? "Road Access" : "No Road Access"}</Badge>, align: "center" as const, width: "130px" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card variant="outlined" className="p-5 bg-cyan-50 border-cyan-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div><p className="text-xs text-slate-500 uppercase tracking-wider">Total Capacity</p><p className="text-xl font-extrabold text-slate-900 tabular-nums">{totalCapacity.toLocaleString()}</p></div>
          </div>
        </Card>
        <Card variant="outlined" className="p-5 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div><p className="text-xs text-slate-500 uppercase tracking-wider">Allocated</p><p className="text-xl font-extrabold text-slate-900 tabular-nums">{totalAllocated.toLocaleString()}</p></div>
          </div>
        </Card>
        <Card variant="outlined" className="p-5 bg-green-50 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div><p className="text-xs text-slate-500 uppercase tracking-wider">Remaining</p><p className="text-xl font-extrabold text-slate-900 tabular-nums">{totalRemaining.toLocaleString()}</p></div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Input label="Search relocation sites..." placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} leftIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} className="max-w-md flex-1" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{filteredAndSortedSites.length} sites</span>
            <Select value={sortConfig.key} onChange={(e) => setSortConfig({ key: e.target.value as SortKey, direction: "desc" })} options={[
              { value: "suitability_score", label: "Suitability Score" },
              { value: "max_capacity", label: "Max Capacity" },
              { value: "available_capacity", label: "Available Capacity" },
              { value: "utilization_pct", label: "Utilization %" },
              { value: "elevation_m", label: "Elevation (m)" },
              { value: "name", label: "Site Name" },
            ]} className="min-w-[180px]" />
            <Button variant="ghost" size="icon" onClick={() => setSortConfig((prev) => ({ ...prev, direction: prev.direction === "asc" ? "desc" : "asc" }))} aria-label={sortConfig.direction === "asc" ? "Sort descending" : "Sort ascending"}>
              <svg className={"w-5 h-5 " + (sortConfig.direction === "desc" ? "rotate-180" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <DataTable columns={columns} data={filteredAndSortedSites} keyAccessor={(s: Site) => s.id} emptyMessage="No sites match the current search." />
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedSites.map((site) => {
          const allocated = site.current_allocation || 0;
          const max = site.max_capacity || 0;
          const utilization = max > 0 ? (allocated / max) * 100 : 0;
          return (
            <Card key={site.id} className="p-5 hover:border-blue-300 transition-all cursor-pointer" onClick={() => handleSiteClick(site.id)}>
              <div className="flex items-start justify-between mb-4">
                <div><h3 className="text-lg font-bold text-slate-900">{site.name}</h3><p className="text-xs text-slate-500 font-mono">{site.id}</p></div>
                <Badge variant="info" size="sm">Suitability: {site.suitability_score.toFixed(2)}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Card variant="outlined" className="p-3 bg-slate-50 border-slate-200"><p className="text-xs text-slate-500">Max Capacity</p><p className="text-lg font-extrabold text-slate-900 tabular-nums">{max.toLocaleString()}</p></Card>
                <Card variant="outlined" className="p-3 bg-slate-50 border-slate-200"><p className="text-xs text-slate-500">Available</p><p className="text-lg font-extrabold text-green-700 tabular-nums">{(site.available_capacity || 0).toLocaleString()}</p></Card>
                <Card variant="outlined" className="p-3 bg-slate-50 border-slate-200"><p className="text-xs text-slate-500">Allocated</p><p className="text-lg font-extrabold text-blue-700 tabular-nums">{allocated.toLocaleString()}</p></Card>
                <Card variant="outlined" className="p-3 bg-slate-50 border-slate-200"><p className="text-xs text-slate-500">Utilization</p><p className={"text-lg font-extrabold tabular-nums " + getUtilizationColorClass(utilization)}>{utilization.toFixed(1)}%</p></Card>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <Card variant="outlined" className="p-2 bg-slate-50 border-slate-200"><p className="text-xs text-slate-500">Elevation</p><p className="text-sm font-semibold text-slate-900">{site.elevation_m?.toLocaleString() ?? "—"}m</p></Card>
                <Card variant="outlined" className="p-2 bg-slate-50 border-slate-200"><p className="text-xs text-slate-500">Area</p><p className="text-sm font-semibold text-slate-900">{site.area_sqkm?.toFixed(2) ?? "—"} km²</p></Card>
                <Card variant="outlined" className="p-2 bg-slate-50 border-slate-200"><p className="text-xs text-slate-500">Ownership</p><p className="text-sm font-semibold text-slate-900 truncate">{site.land_ownership ?? "Unknown"}</p></Card>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={getFloodRiskVariant(site.flood_risk ?? "")} size="sm">{site.flood_risk ?? "Unknown"}</Badge>
                <Badge variant={site.water_available ? "info" : "neutral"} size="sm">💧 Water</Badge>
                <Badge variant={site.power_available ? "warning" : "neutral"} size="sm">⚡ Power</Badge>
                <Badge variant={site.infrastructure_ready ? "success" : "neutral"} size="sm">🏗️ Infra</Badge>
                <Badge variant={site.road_access ? "success" : "danger"} size="sm">🛣️ Road</Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}