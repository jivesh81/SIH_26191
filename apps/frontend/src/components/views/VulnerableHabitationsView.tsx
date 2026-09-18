"use client";

import { useHabitations, Habitation } from "@/hooks/useApi";
import { RiskLevel } from "@/lib/api";
import { useState, useMemo } from "react";
import { useMapState } from "@/context/MapStateContext";
import { Card, Badge, DataTable, Input, Select, Button } from "@/components/ui";

const RISK_COLORS: Record<string, string> = { [RiskLevel.RED_ZONE]: "#991b1b", [RiskLevel.HIGH]: "#dc2626", [RiskLevel.MEDIUM]: "#f97316", [RiskLevel.LOW]: "#16a34a" };
const RISK_LABELS: Record<string, string> = { [RiskLevel.RED_ZONE]: "RED ZONE", [RiskLevel.HIGH]: "HIGH", [RiskLevel.MEDIUM]: "MEDIUM", [RiskLevel.LOW]: "LOW" };

type SortKey = "priority_rank" | "name" | "population" | "vulnerability_score" | "risk_level";

function getHabitationValue(habitation: Habitation, key: SortKey): number | string {
  switch (key) {
    case "priority_rank": return habitation.priority_rank ?? Infinity;
    case "name": return habitation.name;
    case "population": return habitation.population;
    case "vulnerability_score": return habitation.vulnerability_score;
    case "risk_level": { const score = habitation.vulnerability_score; if (score >= 0.85) return 4; if (score >= 0.7) return 3; if (score >= 0.5) return 2; return 1; }
    default: return "";
  }
}

const getRiskVariant = (level: string) => {
  switch (level) {
    case RiskLevel.RED_ZONE: return "danger";
    case RiskLevel.HIGH: return "danger";
    case RiskLevel.MEDIUM: return "warning";
    case RiskLevel.LOW: return "success";
    default: return "neutral";
  }
};

export function VulnerableHabitationsView() {
  const { data: habitationsData, isLoading, error } = useHabitations(false);
  const { setSelection } = useMapState();
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "priority_rank", direction: "asc" });

  const handleHabitationClick = (habitationId: string) => { setSelection({ selectedHabitationId: habitationId }); };

  const habitations = habitationsData?.habitations ?? [];

  const filteredAndSortedHabitations = useMemo(() => {
    let result = habitations.filter((h) => {
      const detRisk = h.vulnerability_score >= 0.85 ? RiskLevel.RED_ZONE : h.vulnerability_score >= 0.7 ? RiskLevel.HIGH : h.vulnerability_score >= 0.5 ? RiskLevel.MEDIUM : RiskLevel.LOW;
      const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = !riskFilter || detRisk === riskFilter;
      return matchesSearch && matchesRisk;
    });
    result.sort((a, b) => {
      let aVal = getHabitationValue(a, sortConfig.key);
      let bVal = getHabitationValue(b, sortConfig.key);
      if (aVal === null || aVal === undefined) aVal = sortConfig.direction === "asc" ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortConfig.direction === "asc" ? Infinity : -Infinity;
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [habitations, searchQuery, riskFilter, sortConfig]);

  const riskCounts = useMemo(() => {
    const counts = { [RiskLevel.RED_ZONE]: 0, [RiskLevel.HIGH]: 0, [RiskLevel.MEDIUM]: 0, [RiskLevel.LOW]: 0 };
    habitations.forEach((h) => { const detRisk = h.vulnerability_score >= 0.85 ? RiskLevel.RED_ZONE : h.vulnerability_score >= 0.7 ? RiskLevel.HIGH : h.vulnerability_score >= 0.5 ? RiskLevel.MEDIUM : RiskLevel.LOW; counts[detRisk]++; });
    return counts;
  }, [habitations]);

  if (isLoading) {
    return (
      <div className="space-y-6 card p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">{[RiskLevel.RED_ZONE, RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW].map((level) => <Card key={level} className="p-5 animate-pulse" />)}</div>
        <Card className="animate-pulse min-h-[400px]" />
      </div>
    );
  }

  if (error) {
    return <Card variant="outlined" className="p-6 text-center bg-red-50 border-red-200"><div className="text-red-500 mb-2">⚠️</div><p className="text-red-600">Failed to load habitation data</p></Card>;
  }

  const handleSort = (key: SortKey) => { setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" })); };
  const getRiskLevel = (score: number) => { if (score >= 0.85) return RiskLevel.RED_ZONE; if (score >= 0.7) return RiskLevel.HIGH; if (score >= 0.5) return RiskLevel.MEDIUM; return RiskLevel.LOW; };

  const columns = [
    { key: "priority", header: "Priority", accessor: (h: Habitation) => h.priority_rank ?? "—", align: "center" as const, width: "80px", monospace: true, onSort: () => handleSort("priority_rank") },
    { key: "name", header: "Habitation", accessor: (h: Habitation) => <span onClick={() => handleHabitationClick(h.id)} className="cursor-pointer font-medium text-slate-900">{h.name}</span>, onSort: () => handleSort("name") },
    { key: "population", header: "Population", accessor: (h: Habitation) => h.population.toLocaleString(), align: "right" as const, width: "120px", monospace: true, onSort: () => handleSort("population") },
    { key: "vulnerability", header: "Vulnerability", accessor: (h: Habitation) => { const detRisk = getRiskLevel(h.vulnerability_score); const color = RISK_COLORS[detRisk]; return <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} /><span className="text-slate-600 font-mono">{h.vulnerability_score.toFixed(2)}</span></div>; }, onSort: () => handleSort("vulnerability_score") },
    { key: "detRisk", header: "Risk Level", accessor: (h: Habitation) => { const detRisk = getRiskLevel(h.vulnerability_score); return <Badge variant={getRiskVariant(detRisk)} size="sm" className="whitespace-nowrap">{RISK_LABELS[detRisk]}</Badge>; }, align: "center" as const, width: "130px", onSort: () => handleSort("risk_level") },
    { key: "nearestSite", header: "Nearest Site", accessor: (h: Habitation) => h.nearest_shelter_id ?? "—" },
    { key: "distance", header: "Distance (km)", accessor: (h: Habitation) => h.nearest_shelter_distance_m ? (h.nearest_shelter_distance_m / 1000).toFixed(1) : "—", align: "right" as const, width: "120px", monospace: true },
    { key: "routeStatus", header: "Route Status", accessor: (h: Habitation) => <Badge variant={h.evacuation_route_id ? "success" : "danger"} size="sm" className="whitespace-nowrap">{h.evacuation_route_id ? "Route Assigned" : "No Route"}</Badge>, align: "center" as const, width: "140px" },
    { key: "accessible", header: "Accessible", accessor: (h: Habitation) => <Badge variant={h.is_accessible ? "success" : "danger"} size="sm" className="whitespace-nowrap">{h.is_accessible ? "✓ Accessible" : "✗ Inaccessible"}</Badge>, align: "center" as const, width: "130px" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { level: RiskLevel.RED_ZONE, label: "Red Zone", color: RISK_COLORS[RiskLevel.RED_ZONE], bg: "bg-red-50", border: "border-red-200" },
          { level: RiskLevel.HIGH, label: "High Risk", color: RISK_COLORS[RiskLevel.HIGH], bg: "bg-orange-50", border: "border-orange-200" },
          { level: RiskLevel.MEDIUM, label: "Medium Risk", color: RISK_COLORS[RiskLevel.MEDIUM], bg: "bg-amber-50", border: "border-amber-200" },
          { level: RiskLevel.LOW, label: "Low Risk", color: RISK_COLORS[RiskLevel.LOW], bg: "bg-green-50", border: "border-green-200" },
        ].map(({ level, label, color, bg, border }) => (
          <button key={level} onClick={() => setRiskFilter(riskFilter === level ? null : level)} className={`card p-5 transition-all relative overflow-hidden group ${riskFilter === level ? "ring-2 ring-blue-300" : ""} ${bg} ${border}`} aria-pressed={riskFilter === level}>
            <div className="relative z-10 flex items-center gap-2 mb-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} /><span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span></div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums">{riskCounts[level]}</div>
            <div className="text-xs text-slate-500 mt-1">habitations</div>
            {riskFilter === level && <div className="absolute top-2 right-2 text-blue-600">✕</div>}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Input label="Search habitations..." placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} leftIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} className="max-w-md flex-1" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{filteredAndSortedHabitations.length} of {habitations.length} habitations</span>
            <Select value={sortConfig.key} onChange={(e) => setSortConfig({ key: e.target.value as SortKey, direction: "asc" })} options={[
              { value: "priority_rank", label: "Priority Rank" },
              { value: "name", label: "Name" },
              { value: "population", label: "Population" },
              { value: "vulnerability_score", label: "Vulnerability Score" },
              { value: "risk_level", label: "Risk Level" },
            ]} className="min-w-[160px]" />
            <Button variant="ghost" size="icon" onClick={() => setSortConfig((prev) => ({ ...prev, direction: prev.direction === "asc" ? "desc" : "asc" }))} aria-label={sortConfig.direction === "asc" ? "Sort descending" : "Sort ascending"}><svg className={`w-5 h-5 ${sortConfig.direction === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg></Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <DataTable columns={columns} data={filteredAndSortedHabitations.slice(0, 100)} keyAccessor={(h: Habitation) => h.id} emptyMessage="No habitations match the current filters." />
        {filteredAndSortedHabitations.length > 100 && <div className="px-4 py-3 border-t border-slate-200 text-center text-xs text-slate-500">Showing 100 of {filteredAndSortedHabitations.length} habitations. Refine search to see more.</div>}
      </Card>

      <Card variant="outlined" className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3"><span className="text-lg">⚠️</span><div><p className="font-semibold text-amber-700 mb-1">ML Predictions are Synthetic Demo Data</p><p className="text-sm text-amber-700">ML risk predictions use a RandomForest model trained on synthetic historical data generated from the Barpeta demo dataset. Final risk uses the more conservative (higher) of deterministic and ML predictions. <strong className="text-amber-800">Not official government data.</strong></p></div></div>
      </Card>
    </div>
  );
}