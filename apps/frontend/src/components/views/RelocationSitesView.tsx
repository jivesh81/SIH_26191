"use client";

import { useSites, Site } from "@/hooks/useApi";
import { useState, useMemo } from "react";
import { useMapState } from "@/context/MapStateContext";

type SortKey =
  | "suitability_score"
  | "max_capacity"
  | "available_capacity"
  | "utilization_pct"
  | "elevation_m"
  | "name";

export function RelocationSitesView() {
  const { data: sitesData, isLoading, error } = useSites(false);
  const { setSelection } = useMapState();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "suitability_score", direction: "desc" });

  const handleSiteClick = (siteId: string) => {
    setSelection({ selectedSiteId: siteId });
  };

  const sites = sitesData?.sites ?? [];

  const getSiteValue = (site: Site, key: SortKey): number | string => {
    switch (key) {
      case "suitability_score":
        return site.suitability_score;
      case "max_capacity":
        return site.max_capacity;
      case "available_capacity":
        return site.available_capacity;
      case "utilization_pct":
        return site.utilization_pct;
      case "elevation_m":
        return site.elevation_m;
      case "name":
        return site.name;
      default:
        return "";
    }
  };

  const filteredAndSortedSites = useMemo(() => {
    let result = sites.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    result.sort((a, b) => {
      let aVal = getSiteValue(a, sortConfig.key);
      let bVal = getSiteValue(b, sortConfig.key);

      if (aVal === null || aVal === undefined)
        aVal = sortConfig.direction === "asc" ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined)
        bVal = sortConfig.direction === "asc" ? Infinity : -Infinity;

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [sites, searchQuery, sortConfig]);

  const totalCapacity = sites.reduce(
    (sum, s) => sum + (s.max_capacity || 0),
    0,
  );
  const totalAllocated = sites.reduce(
    (sum, s) => sum + (s.current_allocation || 0),
    0,
  );
  const totalRemaining = sites.reduce(
    (sum, s) => sum + (s.available_capacity || 0),
    0,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse card-elevated rounded-xl p-5"
            />
          ))}
        </div>
        <div className="animate-pulse card-elevated rounded-xl min-h-[400px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-elevated p-6 text-center">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-red-600">Failed to load site data</p>
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getUtilizationColor = (allocated: number, max: number) => {
    if (max <= 0) return "bg-slate-400";
    const pct = (allocated / max) * 100;
    if (pct >= 90) return "bg-red-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-green-500";
  };

  const getFloodRiskColor = (risk: string) => {
    const riskLower = risk.toLowerCase();
    if (riskLower.includes("high") || riskLower === "red")
      return "bg-red-50 text-red-700 border-red-200";
    if (riskLower.includes("medium") || riskLower === "orange")
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-green-50 text-green-700 border-green-200";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        role="region"
        aria-label="Site capacity summary"
      >
        <div className="card-elevated rounded-xl p-5 bg-cyan-50 border-cyan-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-cyan-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Total Capacity
              </p>
              <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                {totalCapacity.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card-elevated rounded-xl p-5 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Allocated
              </p>
              <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                {totalAllocated.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card-elevated rounded-xl p-5 bg-green-50 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Remaining
              </p>
              <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                {totalRemaining.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
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
            placeholder="Search relocation sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 pr-4"
            aria-label="Search relocation sites"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {filteredAndSortedSites.length} sites
          </span>
          <select
            value={sortConfig.key}
            onChange={(e) =>
              setSortConfig({
                key: e.target.value as SortKey,
                direction: "desc",
              })
            }
            className="select-field px-3 py-2 text-sm min-w-[180px]"
            aria-label="Sort by"
          >
            <option value="suitability_score">Suitability Score</option>
            <option value="max_capacity">Max Capacity</option>
            <option value="available_capacity">Available Capacity</option>
            <option value="utilization_pct">Utilization %</option>
            <option value="elevation_m">Elevation (m)</option>
            <option value="name">Site Name</option>
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

      {/* Sites Table */}
      <div className="card-elevated rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("name")}
                >
                  Site{" "}
                  {sortConfig.key === "name" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("suitability_score")}
                >
                  Suitability{" "}
                  {sortConfig.key === "suitability_score" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("max_capacity")}
                >
                  Max Capacity{" "}
                  {sortConfig.key === "max_capacity" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("available_capacity")}
                >
                  Available{" "}
                  {sortConfig.key === "available_capacity" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("utilization_pct")}
                >
                  Utilization{" "}
                  {sortConfig.key === "utilization_pct" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("elevation_m")}
                >
                  Elevation (m){" "}
                  {sortConfig.key === "elevation_m" &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
                <th className="px-4 py-3">Flood Risk</th>
                <th className="px-4 py-3">Infrastructure</th>
                <th className="px-4 py-3">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAndSortedSites.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No sites match the current search.
                  </td>
                </tr>
              ) : (
                filteredAndSortedSites.map((site, idx) => {
                  const allocated = site.current_allocation || 0;
                  const max = site.max_capacity || 0;
                  const utilization = max > 0 ? (allocated / max) * 100 : 0;

                  return (
                    <tr
                      key={site.id}
                      className={`${idx % 2 === 0 ? "bg-slate-50" : "bg-white"} hover:bg-slate-50 transition-colors cursor-pointer`}
                      onClick={() => handleSiteClick(site.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">
                            {site.name}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            {site.id}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(site.suitability_score * 100, 100)}%`,
                                background: `linear-gradient(90deg, #ef4444, #f97316, #fbbf24, #22c55e)`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 font-mono">
                            {site.suitability_score.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono tabular-nums">
                        {max.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono tabular-nums">
                        {(site.available_capacity || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(utilization, 100)}%`,
                                background: getUtilizationColor(allocated, max),
                              }}
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold font-mono ${utilization >= 90 ? "text-red-600" : utilization >= 70 ? "text-amber-600" : "text-green-600"}`}
                          >
                            {utilization.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono tabular-nums">
                        {site.elevation_m?.toLocaleString() || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getFloodRiskColor(site.flood_risk)}`}
                        >
                          {site.flood_risk || "Unknown"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded ${site.water_available ? "bg-blue-500" : "bg-slate-300"}`}
                            title="Water"
                          />
                          <span
                            className={`w-2 h-2 rounded ${site.power_available ? "bg-amber-500" : "bg-slate-300"}`}
                            title="Power"
                          />
                          <span
                            className={`w-2 h-2 rounded ${site.infrastructure_ready ? "bg-green-500" : "bg-slate-300"}`}
                            title="Infra Ready"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${site.road_access ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
                        >
                          {site.road_access ? "Road Access" : "No Road Access"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Site Details Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedSites.map((site) => {
          const allocated = site.current_allocation || 0;
          const max = site.max_capacity || 0;
          const utilization = max > 0 ? (allocated / max) * 100 : 0;

          return (
            <article
              key={site.id}
              className="card-elevated rounded-xl p-5 hover:border-blue-300 transition-all duration-200 cursor-pointer"
              onClick={() => handleSiteClick(site.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {site.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{site.id}</p>
                </div>
                <span className="badge badge-cyan">
                  Suitability: {site.suitability_score.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                  <p className="text-xs text-slate-500">Max Capacity</p>
                  <p className="text-lg font-extrabold text-slate-900 tabular-nums">
                    {max.toLocaleString()}
                  </p>
                </div>
                <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                  <p className="text-xs text-slate-500">Available</p>
                  <p className="text-lg font-extrabold text-green-700 tabular-nums">
                    {(site.available_capacity || 0).toLocaleString()}
                  </p>
                </div>
                <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                  <p className="text-xs text-slate-500">Allocated</p>
                  <p className="text-lg font-extrabold text-blue-700 tabular-nums">
                    {allocated.toLocaleString()}
                  </p>
                </div>
                <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                  <p className="text-xs text-slate-500">Utilization</p>
                  <p
                    className={`text-lg font-extrabold tabular-nums ${utilization >= 90 ? "text-red-600" : utilization >= 70 ? "text-amber-600" : "text-green-600"}`}
                  >
                    {utilization.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="card bg-slate-50 rounded-lg p-2 border-slate-200">
                  <p className="text-xs text-slate-500">Elevation</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {site.elevation_m?.toLocaleString() || "—"}m
                  </p>
                </div>
                <div className="card bg-slate-50 rounded-lg p-2 border-slate-200">
                  <p className="text-xs text-slate-500">Area</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {site.area_sqkm?.toFixed(2) || "—"} km²
                  </p>
                </div>
                <div className="card bg-slate-50 rounded-lg p-2 border-slate-200">
                  <p className="text-xs text-slate-500">Ownership</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {site.land_ownership || "Unknown"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`badge ${getFloodRiskColor(site.flood_risk)}`}>
                  {site.flood_risk || "Unknown"}
                </span>
                <span
                  className={`badge ${site.water_available ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                >
                  💧 Water
                </span>
                <span
                  className={`badge ${site.power_available ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                >
                  ⚡ Power
                </span>
                <span
                  className={`badge ${site.infrastructure_ready ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                >
                  🏗️ Infra
                </span>
                <span
                  className={`badge ${site.road_access ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                >
                  🛣️ Road
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
