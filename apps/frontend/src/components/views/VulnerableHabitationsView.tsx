"use client";

import { useHabitations, Habitation } from "@/hooks/useApi";
import { RiskLevel } from "@/lib/api";
import { useState, useMemo } from "react";
import { useMapState } from "@/context/MapStateContext";

const RISK_COLORS: Record<string, string> = {
  [RiskLevel.RED_ZONE]: "#991b1b",
  [RiskLevel.HIGH]: "#dc2626",
  [RiskLevel.MEDIUM]: "#f97316",
  [RiskLevel.LOW]: "#16a34a",
};

const RISK_LABELS: Record<string, string> = {
  [RiskLevel.RED_ZONE]: "RED ZONE",
  [RiskLevel.HIGH]: "HIGH",
  [RiskLevel.MEDIUM]: "MEDIUM",
  [RiskLevel.LOW]: "LOW",
};

type SortKey =
  | "priority_rank"
  | "name"
  | "population"
  | "vulnerability_score"
  | "risk_level";

function getHabitationValue(
  habitation: Habitation,
  key: SortKey,
): number | string {
  switch (key) {
    case "priority_rank":
      return habitation.priority_rank ?? Infinity;
    case "name":
      return habitation.name;
    case "population":
      return habitation.population;
    case "vulnerability_score":
      return habitation.vulnerability_score;
    case "risk_level": {
      const score = habitation.vulnerability_score;
      if (score >= 0.85) return 4;
      if (score >= 0.7) return 3;
      if (score >= 0.5) return 2;
      return 1;
    }
    default:
      return "";
  }
}

export function VulnerableHabitationsView() {
  const { data: habitationsData, isLoading, error } = useHabitations(false);
  const { setSelection } = useMapState();
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "priority_rank", direction: "asc" });

  const handleHabitationClick = (habitationId: string) => {
    setSelection({ selectedHabitationId: habitationId });
  };

  const habitations = habitationsData?.habitations ?? [];

  const filteredAndSortedHabitations = useMemo(() => {
    let result = habitations.filter((h) => {
      const detRisk =
        h.vulnerability_score >= 0.85
          ? RiskLevel.RED_ZONE
          : h.vulnerability_score >= 0.7
            ? RiskLevel.HIGH
            : h.vulnerability_score >= 0.5
              ? RiskLevel.MEDIUM
              : RiskLevel.LOW;

      const matchesSearch = h.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesRisk = !riskFilter || detRisk === riskFilter;
      return matchesSearch && matchesRisk;
    });

    result.sort((a, b) => {
      let aVal = getHabitationValue(a, sortConfig.key);
      let bVal = getHabitationValue(b, sortConfig.key);

      if (aVal === null || aVal === undefined)
        aVal = sortConfig.direction === "asc" ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined)
        bVal = sortConfig.direction === "asc" ? Infinity : -Infinity;

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [habitations, searchQuery, riskFilter, sortConfig]);

  const riskCounts = useMemo(() => {
    const counts = {
      [RiskLevel.RED_ZONE]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.LOW]: 0,
    };
    habitations.forEach((h) => {
      const detRisk =
        h.vulnerability_score >= 0.85
          ? RiskLevel.RED_ZONE
          : h.vulnerability_score >= 0.7
            ? RiskLevel.HIGH
            : h.vulnerability_score >= 0.5
              ? RiskLevel.MEDIUM
              : RiskLevel.LOW;
      counts[detRisk]++;
    });
    return counts;
  }, [habitations]);

  if (isLoading) {
    return (
      <div className="space-y-6 card-elevated p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            RiskLevel.RED_ZONE,
            RiskLevel.HIGH,
            RiskLevel.MEDIUM,
            RiskLevel.LOW,
          ].map((level) => (
            <div key={level} className="animate-pulse card rounded-xl p-5" />
          ))}
        </div>
        <div className="animate-pulse card rounded-xl min-h-[400px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-elevated p-6 text-center">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-red-600">Failed to load habitation data</p>
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getRiskLevel = (score: number) => {
    if (score >= 0.85) return RiskLevel.RED_ZONE;
    if (score >= 0.7) return RiskLevel.HIGH;
    if (score >= 0.5) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  };

  return (
    <div className="space-y-6">
      {/* Risk Summary Cards */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        role="region"
        aria-label="Risk level summary"
      >
        {[
          {
            level: RiskLevel.RED_ZONE,
            label: "Red Zone",
            color: RISK_COLORS[RiskLevel.RED_ZONE],
            bg: "bg-red-50",
            border: "border-red-200",
          },
          {
            level: RiskLevel.HIGH,
            label: "High Risk",
            color: RISK_COLORS[RiskLevel.HIGH],
            bg: "bg-orange-50",
            border: "border-orange-200",
          },
          {
            level: RiskLevel.MEDIUM,
            label: "Medium Risk",
            color: RISK_COLORS[RiskLevel.MEDIUM],
            bg: "bg-amber-50",
            border: "border-amber-200",
          },
          {
            level: RiskLevel.LOW,
            label: "Low Risk",
            color: RISK_COLORS[RiskLevel.LOW],
            bg: "bg-green-50",
            border: "border-green-200",
          },
        ].map(({ level, label, color, bg, border }) => (
          <button
            key={level}
            onClick={() => setRiskFilter(riskFilter === level ? null : level)}
            className={`card-elevated p-5 rounded-xl transition-all duration-200 relative overflow-hidden group ${riskFilter === level ? "ring-2 ring-blue-300" : ""} ${bg} ${border}`}
            aria-pressed={riskFilter === level}
          >
            <div className="relative z-10 flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {label}
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums">
              {riskCounts[level]}
            </div>
            <div className="text-xs text-slate-500 mt-1">habitations</div>
            {riskFilter === level && (
              <div className="absolute top-2 right-2 text-blue-600">✕</div>
            )}
          </button>
        ))}
      </div>

      {/* Search & Controls */}
      <div className="card-elevated p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search habitations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 pr-4"
            aria-label="Search habitations"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {filteredAndSortedHabitations.length} of {habitations.length}{" "}
            habitations
          </span>
          <select
            value={sortConfig.key}
            onChange={(e) =>
              setSortConfig({
                key: e.target.value as SortKey,
                direction: "asc",
              })
            }
            className="select-field px-3 py-2 text-sm min-w-[160px]"
            aria-label="Sort by"
          >
            <option value="priority_rank">Priority Rank</option>
            <option value="name">Name</option>
            <option value="population">Population</option>
            <option value="vulnerability_score">Vulnerability Score</option>
            <option value="risk_level">Risk Level</option>
          </select>
          <button
            onClick={() =>
              setSortConfig((prev) => ({
                ...prev,
                direction: prev.direction === "asc" ? "desc" : "asc",
              }))
            }
            className="btn-ghost p-2"
            aria-label={
              sortConfig.direction === "asc"
                ? "Sort descending"
                : "Sort ascending"
            }
          >
            <svg
              className={`w-5 h-5 ${sortConfig.direction === "desc" ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Habitation Table */}
      <div className="card-elevated rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("priority_rank")}
                >
                  Priority{" "}
                  {sortConfig.key === "priority_rank" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("name")}
                >
                  Habitation{" "}
                  {sortConfig.key === "name" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("population")}
                >
                  Population{" "}
                  {sortConfig.key === "population" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("vulnerability_score")}
                >
                  Vulnerability{" "}
                  {sortConfig.key === "vulnerability_score" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("risk_level")}
                >
                  Risk Level{" "}
                  {sortConfig.key === "risk_level" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th className="px-4 py-3">Nearest Site</th>
                <th className="px-4 py-3">Distance (km)</th>
                <th className="px-4 py-3">Route Status</th>
                <th className="px-4 py-3">Accessible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAndSortedHabitations.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No habitations match the current filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedHabitations
                  .slice(0, 100)
                  .map((habitation, idx) => {
                    const detRisk = getRiskLevel(
                      habitation.vulnerability_score,
                    );
                    const riskColor = RISK_COLORS[detRisk];
                    const riskLabel = RISK_LABELS[detRisk];

                    const riskBadgeClasses: Record<string, string> = {
                      RED_ZONE: "bg-red-50 text-red-700 border-red-200",
                      HIGH: "bg-orange-50 text-orange-700 border-orange-200",
                      MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
                      LOW: "bg-green-50 text-green-700 border-green-200",
                    };

                    return (
                      <tr
                        key={habitation.id}
                        className={`${idx % 2 === 0 ? "bg-slate-50" : "bg-white"} hover:bg-slate-50 transition-colors cursor-pointer`}
                        onClick={() => handleHabitationClick(habitation.id)}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-blue-600 tabular-nums">
                          {habitation.priority_rank ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {habitation.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 tabular-nums">
                          {habitation.population.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded"
                              style={{ backgroundColor: riskColor }}
                            />
                            <span className="text-slate-600 font-mono">
                              {habitation.vulnerability_score.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${riskBadgeClasses[detRisk]}`}
                          >
                            {riskLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {habitation.nearest_shelter_id ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono">
                          {habitation.nearest_shelter_distance_m
                            ? (
                                habitation.nearest_shelter_distance_m / 1000
                              ).toFixed(1)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              habitation.evacuation_route_id
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {habitation.evacuation_route_id
                              ? "Route Assigned"
                              : "No Route"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              habitation.is_accessible
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {habitation.is_accessible
                              ? "✓ Accessible"
                              : "✗ Inaccessible"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {filteredAndSortedHabitations.length > 100 && (
          <div className="p-4 border-t border-slate-200 text-center text-xs text-slate-500">
            Showing 100 of {filteredAndSortedHabitations.length} habitations.
            Refine search to see more.
          </div>
        )}
      </div>

      {/* ML Disclaimer */}
      <div className="card-elevated rounded-xl p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold text-amber-700 mb-1">
              ML Predictions are Synthetic Demo Data
            </p>
            <p className="text-sm text-amber-700">
              ML risk predictions use a RandomForest model trained on synthetic
              historical data generated from the Barpeta demo dataset. Final
              risk uses the more conservative (higher) of deterministic and ML
              predictions.
              <strong className="text-amber-800">
                Not official government data.
              </strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
