"use client";

import { useState, useEffect, useRef } from "react";
import {
  getHabitations,
  getSites,
  getRoutes,
  getActivePlan,
  checkRouteFeasibility,
} from "@/lib/api";
import {
  Habitation,
  Site,
  Route,
  RiskAssessmentResponse,
  RiskAssessmentListResponse,
} from "@/lib/api";
import {
  useRouteFeasibilityCheck,
  useSites,
  useHabitations,
  useRoutes,
  useRiskAssessments,
} from "@/hooks/useApi";
import { EvacuationGuidance } from "@/components/panels/EvacuationGuidance";

interface MapIntelligenceViewProps {
  onSiteSelect?: (site: Site, route: Route | null) => void;
}

const BARPETA_BOUNDS: [number, number, number, number] = [
  90.5, 26.0, 91.5, 27.0,
];
const BARPETA_CENTER: [number, number] = [91.0, 26.5];

const RISK_COLORS = {
  RED_ZONE: "#991b1b",
  HIGH: "#dc2626",
  MEDIUM: "#f97316",
  LOW: "#16a34a",
};

const COLORS = {
  site: "#059669",
  routeOpen: "#16a34a",
  routeCongested: "#f97316",
  routeClosed: "#dc2626",
  evacuation: "#2563eb",
  evacuationOutline: "#ffffff",
  text: "#0f172a",
};

const RISK_LABELS: Record<string, string> = {
  RED_ZONE: "RED ZONE",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
};

function getFeatureCenter(geometry: any): [number, number] | null {
  if (!geometry) return null;
  if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
    return [Number(geometry.coordinates[0]), Number(geometry.coordinates[1])];
  }
  const coords = collectCoordinates(geometry.coordinates);
  if (!coords.length) return null;
  const lng = coords.reduce((sum, p) => sum + p[0], 0) / coords.length;
  const lat = coords.reduce((sum, p) => sum + p[1], 0) / coords.length;
  return [lng, lat];
}

function collectCoordinates(value: any): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return [[Number(value[0]), Number(value[1])]];
  }
  return value.flatMap(collectCoordinates);
}

function makeFeatureCollection(features: any[]) {
  return { type: "FeatureCollection", features };
}

function updateSource(map: any, sourceId: string, data: any) {
  const source = map.getSource(sourceId);
  if (source) source.setData(data);
}

function normalizeRouteStatus(
  status: string | undefined,
): "open" | "congested" | "closed" {
  const value = String(status ?? "").toLowerCase();
  if (value === "impassable" || value === "closed" || value === "blocked")
    return "closed";
  if (value === "congested") return "congested";
  return "open";
}

function getNearestHabitation(
  site: Site,
  habitations: Habitation[],
): Habitation | null {
  const siteCenter = getFeatureCenter(site.geometry);
  if (!siteCenter) return null;

  let nearest: Habitation | null = null;
  let minDist = Infinity;

  for (const hab of habitations) {
    const habCenter = getFeatureCenter(hab.geometry);
    if (!habCenter) continue;

    const dx = habCenter[0] - siteCenter[0];
    const dy = habCenter[1] - siteCenter[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;
      nearest = hab;
    }
  }

  return nearest;
}

function findRouteGeometry(routeId: string, routes: Route[]): Route | null {
  return routes.find((r) => r.id === routeId) ?? null;
}

declare global {
  interface Window {
    __siteClickHandler?: (siteId: string, feature: any) => void;
  }
}

export function MapIntelligenceView({
  onSiteSelect,
}: MapIntelligenceViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [evacuationRoute, setEvacuationRoute] = useState<Route | null>(null);
  const [routeFeasibility, setRouteFeasibility] = useState<{
    feasible: boolean;
    reason: string;
    routeUsed: string | null;
  } | null>(null);
  const [showGuidance, setShowGuidance] = useState(false);
  const [guidanceData, setGuidanceData] = useState<{
    siteName: string;
    route: Route | null;
    feasible: boolean;
    reason: string;
    transportMode: "BUS" | "CAR" | "BIKE" | "WALK" | "BOAT" | "NOT_AVAILABLE";
    estimatedTime: string;
    urgency: "IMMEDIATE" | "URGENT" | "PLANNED" | "NOT_AVAILABLE";
  } | null>(null);
  const [layerVisibility, setLayerVisibility] = useState({
    habitations: true,
    sites: true,
    routes: true,
    evacuation: true,
    hazardZones: false,
  });
  const [showLegend, setShowLegend] = useState(true);

  const { data: habitationsData, isLoading: habitationsLoading } =
    useHabitations(false);
  const { data: sitesData, isLoading: sitesLoading } = useSites(false);
  const { data: routesData, isLoading: routesLoading } = useRoutes(false);
  const { data: riskData, isLoading: riskLoading } = useRiskAssessments();

  const habitations = habitationsData?.habitations ?? [];
  const sites = sitesData?.sites ?? [];
  const routes = routesData?.routes ?? [];
  const riskAssessments: RiskAssessmentResponse[] =
    (riskData as RiskAssessmentListResponse)?.assessments ?? [];

  const riskMap = new Map<string, string>(
    riskAssessments.map((r) => [r.habitation_id, r.risk_level]),
  );

  const nearestHab = selectedSite
    ? getNearestHabitation(selectedSite, habitations)
    : null;
  const { data: feasibilityData, isLoading: feasibilityLoading } =
    useRouteFeasibilityCheck(
      selectedSite && nearestHab ? nearestHab.id : "",
      selectedSite?.id ?? "",
    );

  useEffect(() => {
    if (feasibilityData) {
      setRouteFeasibility({
        feasible: feasibilityData.feasible,
        reason: feasibilityData.reason,
        routeUsed: feasibilityData.route_used,
      });
      const route = routes.find((r) => r.id === feasibilityData.route_used);
      setEvacuationRoute(route ?? null);
    }
  }, [feasibilityData, routes]);

  useEffect(() => {
    window.__siteClickHandler = (siteId: string, feature: any) => {
      const site = sites.find((s) => s.id === siteId);
      if (site) {
        setSelectedSite(site);
      }
    };
    return () => {
      window.__siteClickHandler = undefined;
    };
  }, [sites]);

  const loadDataLayers = async (map: any) => {
    try {
      addHabitationLayer(map, habitations);
      addSiteLayer(map, sites);
      addRouteLayer(map, routes);
      fitToData(map, habitations, sites);
    } catch (error) {
      console.error("Error loading map data:", error);
    }
  };

  const getHabitationRiskLevel = (habitationId: string): string => {
    return riskMap.get(habitationId) ?? "LOW";
  };

  const getHabitationRiskColor = (habitationId: string): string => {
    const level = getHabitationRiskLevel(habitationId);
    return RISK_COLORS[level as keyof typeof RISK_COLORS] || RISK_COLORS.LOW;
  };

  const addHabitationLayer = (map: any, habitations: Habitation[]) => {
    const features = habitations
      .filter((h) => h.geometry)
      .map((h) => ({
        type: "Feature" as const,
        geometry: h.geometry,
        properties: {
          id: h.id,
          name: h.name,
          population: h.population,
          vulnerability_score: h.vulnerability_score,
          priority_rank: h.priority_rank,
          risk_level: getHabitationRiskLevel(h.id),
        },
      }));
    const data = makeFeatureCollection(features);

    if (!map.getSource("habitations")) {
      map.addSource("habitations", { type: "geojson", data });
    } else {
      updateSource(map, "habitations", data);
    }

    if (!map.getLayer("habitations")) {
      map.addLayer({
        id: "habitations",
        type: "circle",
        source: "habitations",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "population"],
            0,
            6,
            500,
            8,
            1000,
            10,
            2000,
            12,
            3000,
            14,
          ],
          "circle-color": [
            "match",
            ["get", "risk_level"],
            "RED_ZONE",
            RISK_COLORS.RED_ZONE,
            "HIGH",
            RISK_COLORS.HIGH,
            "MEDIUM",
            RISK_COLORS.MEDIUM,
            RISK_COLORS.LOW,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 0.95,
        } as any,
      });
    }

    if (!map.getLayer("habitation-labels")) {
      map.addLayer({
        id: "habitation-labels",
        type: "symbol",
        source: "habitations",
        filter: ["<=", ["get", "priority_rank"], 10],
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
        },
        paint: {
          "text-color": COLORS.text,
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });
    }

    if (map.getLayer("habitations")) {
      map.setLayoutProperty(
        "habitations",
        "visibility",
        layerVisibility.habitations ? "visible" : "none",
      );
      map.setLayoutProperty(
        "habitation-labels",
        "visibility",
        layerVisibility.habitations ? "visible" : "none",
      );
    }
  };

  const addSiteLayer = (map: any, sites: Site[]) => {
    const features = sites
      .filter((s) => s.geometry)
      .map((s) => ({
        type: "Feature" as const,
        geometry: s.geometry,
        properties: {
          id: s.id,
          name: s.name,
          max_capacity: s.max_capacity,
          available_capacity: s.available_capacity,
          suitability_score: s.suitability_score,
          elevation_m: s.elevation_m,
        },
      }));
    const data = makeFeatureCollection(features);

    if (!map.getSource("sites")) {
      map.addSource("sites", { type: "geojson", data });
    } else {
      updateSource(map, "sites", data);
    }

    if (!map.getLayer("sites-polygon")) {
      map.addLayer({
        id: "sites-polygon",
        type: "fill",
        source: "sites",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": COLORS.site,
          "fill-opacity": 0.18,
          "fill-outline-color": COLORS.site,
        },
      });
    }

    if (!map.getLayer("sites-point")) {
      map.addLayer({
        id: "sites-point",
        type: "circle",
        source: "sites",
        paint: {
          "circle-radius": 10,
          "circle-color": COLORS.site,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
    }

    if (!map.getLayer("site-labels")) {
      map.addLayer({
        id: "site-labels",
        type: "symbol",
        source: "sites",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-offset": [0, -1.4],
          "text-anchor": "bottom",
        },
        paint: {
          "text-color": "#065f46",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });
    }

    if (map.getLayer("sites-polygon")) {
      map.setLayoutProperty(
        "sites-polygon",
        "visibility",
        layerVisibility.sites ? "visible" : "none",
      );
      map.setLayoutProperty(
        "sites-point",
        "visibility",
        layerVisibility.sites ? "visible" : "none",
      );
      map.setLayoutProperty(
        "site-labels",
        "visibility",
        layerVisibility.sites ? "visible" : "none",
      );
    }

    map.on("click", "sites-point", (e: any) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const siteId = feature.properties?.id;
      const site = sites.find((s) => s.id === siteId);
      if (site) {
        setSelectedSite(site);
      }
    });
  };

  const addRouteLayer = (map: any, routes: Route[]) => {
    const features = routes
      .filter((r) => r.geometry)
      .map((r) => ({
        type: "Feature" as const,
        geometry: r.geometry,
        properties: {
          id: r.id,
          name: r.name,
          route_type: r.route_type,
          status: r.status,
        },
      }));
    const data = makeFeatureCollection(features);

    if (!map.getSource("routes")) {
      map.addSource("routes", { type: "geojson", data });
    } else {
      updateSource(map, "routes", data);
    }

    if (!map.getLayer("routes-base")) {
      map.addLayer({
        id: "routes-base",
        type: "line",
        source: "routes",
        paint: {
          "line-color": [
            "match",
            ["get", "status"],
            "impassable",
            COLORS.routeClosed,
            "closed",
            COLORS.routeClosed,
            "blocked",
            COLORS.routeClosed,
            "congested",
            COLORS.routeCongested,
            COLORS.routeOpen,
          ],
          "line-width": [
            "match",
            ["get", "status"],
            "impassable",
            5,
            "closed",
            5,
            "blocked",
            5,
            "congested",
            4,
            3,
          ],
          "line-opacity": 0.9,
        },
      });
    }

    if (!map.getLayer("routes-closed-pattern")) {
      map.addLayer({
        id: "routes-closed-pattern",
        type: "line",
        source: "routes",
        filter: ["in", ["get", "status"], "impassable", "closed", "blocked"],
        paint: {
          "line-color": "#7f1d1d",
          "line-width": 3,
          "line-dasharray": [8, 4],
          "line-opacity": 0.95,
        },
      });
    }

    if (!map.getLayer("route-labels")) {
      map.addLayer({
        id: "route-labels",
        type: "symbol",
        source: "routes",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 9,
          "text-offset": [0, -1],
          "symbol-placement": "line",
        },
        paint: {
          "text-color": "#334155",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      });
    }

    if (map.getLayer("routes-base")) {
      map.setLayoutProperty(
        "routes-base",
        "visibility",
        layerVisibility.routes ? "visible" : "none",
      );
      map.setLayoutProperty(
        "routes-closed-pattern",
        "visibility",
        layerVisibility.routes ? "visible" : "none",
      );
      map.setLayoutProperty(
        "route-labels",
        "visibility",
        layerVisibility.routes ? "visible" : "none",
      );
    }
  };

  const addEvacuationRouteLayer = (map: any, route: Route | null) => {
    if (!route?.geometry) {
      if (map.getSource("evacuation-route")) {
        map.removeLayer("evacuation-route");
        map.removeLayer("evacuation-route-outline");
        map.removeSource("evacuation-route");
      }
      return;
    }

    const data = makeFeatureCollection([
      {
        type: "Feature" as const,
        geometry: route.geometry,
        properties: { id: route.id, name: route.name },
      },
    ]);

    if (!map.getSource("evacuation-route")) {
      map.addSource("evacuation-route", { type: "geojson", data });
    } else {
      updateSource(map, "evacuation-route", data);
    }

    if (!map.getLayer("evacuation-route-outline")) {
      map.addLayer({
        id: "evacuation-route-outline",
        type: "line",
        source: "evacuation-route",
        paint: {
          "line-color": COLORS.evacuationOutline,
          "line-width": 6,
          "line-opacity": 0.9,
        },
      });
    }

    if (!map.getLayer("evacuation-route")) {
      map.addLayer({
        id: "evacuation-route",
        type: "line",
        source: "evacuation-route",
        paint: {
          "line-color": COLORS.evacuation,
          "line-width": 3,
          "line-dasharray": [4, 2],
          "line-opacity": 0.95,
        },
      });
    }

    if (map.getLayer("evacuation-route")) {
      map.setLayoutProperty(
        "evacuation-route",
        "visibility",
        layerVisibility.evacuation ? "visible" : "none",
      );
      map.setLayoutProperty(
        "evacuation-route-outline",
        "visibility",
        layerVisibility.evacuation ? "visible" : "none",
      );
    }
  };

  const fitToData = (map: any, habitations: Habitation[], sites: Site[]) => {
    const points: Array<[number, number]> = [];
    [...habitations, ...sites].forEach((item: any) => {
      const point = getFeatureCenter(item.geometry);
      if (point) points.push(point);
    });
    if (points.length < 2) return;
    const lngs = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, duration: 700, maxZoom: 12 },
    );
  };

  useEffect(() => {
    if (mapRef.current) {
      addEvacuationRouteLayer(mapRef.current, evacuationRoute);
    }
  }, [evacuationRoute, layerVisibility.evacuation]);

  useEffect(() => {
    if (mapRef.current) {
      [
        "habitations",
        "habitation-labels",
        "sites-polygon",
        "sites-point",
        "site-labels",
        "routes-base",
        "routes-closed-pattern",
        "route-labels",
        "evacuation-route",
        "evacuation-route-outline",
      ].forEach((layerId) => {
        if (mapRef.current?.getLayer(layerId)) {
          const visible =
            layerVisibility.habitations ||
            layerVisibility.sites ||
            layerVisibility.routes ||
            layerVisibility.evacuation;
        }
      });

      if (mapRef.current.getLayer("habitations")) {
        mapRef.current.setLayoutProperty(
          "habitations",
          "visibility",
          layerVisibility.habitations ? "visible" : "none",
        );
        mapRef.current.setLayoutProperty(
          "habitation-labels",
          "visibility",
          layerVisibility.habitations ? "visible" : "none",
        );
      }
      if (mapRef.current.getLayer("sites-polygon")) {
        mapRef.current.setLayoutProperty(
          "sites-polygon",
          "visibility",
          layerVisibility.sites ? "visible" : "none",
        );
        mapRef.current.setLayoutProperty(
          "sites-point",
          "visibility",
          layerVisibility.sites ? "visible" : "none",
        );
        mapRef.current.setLayoutProperty(
          "site-labels",
          "visibility",
          layerVisibility.sites ? "visible" : "none",
        );
      }
      if (mapRef.current.getLayer("routes-base")) {
        mapRef.current.setLayoutProperty(
          "routes-base",
          "visibility",
          layerVisibility.routes ? "visible" : "none",
        );
        mapRef.current.setLayoutProperty(
          "routes-closed-pattern",
          "visibility",
          layerVisibility.routes ? "visible" : "none",
        );
        mapRef.current.setLayoutProperty(
          "route-labels",
          "visibility",
          layerVisibility.routes ? "visible" : "none",
        );
      }
      if (mapRef.current.getLayer("evacuation-route")) {
        mapRef.current.setLayoutProperty(
          "evacuation-route",
          "visibility",
          layerVisibility.evacuation ? "visible" : "none",
        );
        mapRef.current.setLayoutProperty(
          "evacuation-route-outline",
          "visibility",
          layerVisibility.evacuation ? "visible" : "none",
        );
      }
    }
  }, [layerVisibility]);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    let disposed = false;

    import("maplibre-gl").then((maplibregl) => {
      if (disposed || !mapContainerRef.current) return;
      const MapLibre = maplibregl.default;
      const map = new MapLibre.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
              maxzoom: 19,
            },
          },
          layers: [
            {
              id: "osm-base",
              type: "raster",
              source: "osm",
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: BARPETA_CENTER,
        zoom: 9.5,
        bounds: BARPETA_BOUNDS,
        attributionControl: false,
      });

      map.addControl(
        new MapLibre.AttributionControl({ compact: true }),
        "bottom-right",
      );
      map.addControl(
        new MapLibre.NavigationControl({ visualizePitch: true }),
        "top-right",
      );
      map.addControl(
        new MapLibre.ScaleControl({ unit: "metric" }),
        "bottom-left",
      );

      map.on("load", async () => {
        await loadDataLayers(map);
      });

      mapRef.current = map;
    });

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const toggleLayer = (layer: keyof typeof layerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const riskCounts = {
    RED_ZONE: riskAssessments.filter((r) => r.risk_level === "RED_ZONE").length,
    HIGH: riskAssessments.filter((r) => r.risk_level === "HIGH").length,
    MEDIUM: riskAssessments.filter((r) => r.risk_level === "MEDIUM").length,
    LOW: riskAssessments.filter((r) => r.risk_level === "LOW").length,
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Map Intelligence
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Map Ready</span>
        </div>
      </div>

      {/* Layer Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600">Layers:</span>
        <button
          onClick={() => toggleLayer("habitations")}
          className={`px-2 py-1 text-xs rounded border transition-colors ${layerVisibility.habitations ? "bg-blue-100 border-blue-400 text-blue-800" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          Habitations
        </button>
        <button
          onClick={() => toggleLayer("sites")}
          className={`px-2 py-1 text-xs rounded border transition-colors ${layerVisibility.sites ? "bg-green-100 border-green-400 text-green-800" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          Sites
        </button>
        <button
          onClick={() => toggleLayer("routes")}
          className={`px-2 py-1 text-xs rounded border transition-colors ${layerVisibility.routes ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          Routes
        </button>
        <button
          onClick={() => toggleLayer("evacuation")}
          className={`px-2 py-1 text-xs rounded border transition-colors ${layerVisibility.evacuation ? "bg-cyan-100 border-cyan-400 text-cyan-800" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          Evacuation
        </button>
        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`px-2 py-1 text-xs rounded border transition-colors ${showLegend ? "bg-slate-100 border-slate-400 text-slate-800" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          Legend
        </button>
      </div>

      <div className="flex-1 relative">
        <div
          ref={mapContainerRef}
          className="w-full h-full rounded-lg border border-slate-200 overflow-hidden"
          aria-label="Barpeta district disaster management map"
        />

        {/* Legend */}
        {showLegend && (
          <div className="absolute left-3 bottom-3 z-10 bg-white/95 backdrop-blur rounded-lg shadow-md border border-slate-200 px-3 py-2">
            <div className="text-xs font-semibold text-slate-800 mb-2">
              Map Legend
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-700">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: RISK_COLORS.RED_ZONE }}
                />
                RED ZONE ({riskCounts.RED_ZONE})
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: RISK_COLORS.HIGH }}
                />
                HIGH ({riskCounts.HIGH})
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: RISK_COLORS.MEDIUM }}
                />
                MEDIUM ({riskCounts.MEDIUM})
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: RISK_COLORS.LOW }}
                />
                LOW ({riskCounts.LOW})
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: COLORS.site }}
                />
                Safe Site
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-0.5"
                  style={{ background: COLORS.routeOpen }}
                />
                Open Road
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-0.5"
                  style={{ background: COLORS.routeClosed }}
                />
                Blocked Road
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-6 border-t-2 border-dashed"
                  style={{ borderColor: COLORS.evacuation }}
                />
                Evacuation Route
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Site Detail Panel */}
      {selectedSite && (
        <div className="mt-4 bg-white rounded-lg border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: COLORS.site }}
              />
              {selectedSite.name}
            </h3>
            <button
              onClick={() => {
                setSelectedSite(null);
                setEvacuationRoute(null);
                setRouteFeasibility(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-500">Site ID:</span>{" "}
              <span className="font-mono text-slate-700">
                {selectedSite.id}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Max Capacity:</span>{" "}
              <span className="font-semibold text-slate-900">
                {selectedSite.max_capacity?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Available Capacity:</span>{" "}
              <span className="font-semibold text-green-700">
                {selectedSite.available_capacity?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Current Allocation:</span>{" "}
              <span className="font-semibold text-slate-700">
                {selectedSite.current_allocation?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Suitability:</span>{" "}
              <span className="font-semibold text-slate-700">
                {(selectedSite.suitability_score * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-slate-500">Elevation:</span>{" "}
              <span className="font-semibold text-slate-700">
                {selectedSite.elevation_m}m
              </span>
            </div>
            <div>
              <span className="text-slate-500">Flood Risk:</span>{" "}
              <span className="font-semibold text-slate-700 capitalize">
                {selectedSite.flood_risk}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Infrastructure Ready:</span>{" "}
              <span className="font-semibold">
                {selectedSite.infrastructure_ready ? "Yes" : "No"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Water:</span>{" "}
              <span className="font-semibold">
                {selectedSite.water_available ? "Yes" : "No"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Power:</span>{" "}
              <span className="font-semibold">
                {selectedSite.power_available ? "Yes" : "No"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Road Access:</span>{" "}
              <span className="font-semibold">
                {selectedSite.road_access ? "Yes" : "No"}
              </span>
            </div>
          </div>

          {nearestHab && (
            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">
                Nearest Affected Habitation
              </h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-slate-500">Habitation:</span>{" "}
                  <span className="font-semibold">{nearestHab.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Population:</span>{" "}
                  <span className="font-semibold">
                    {nearestHab.population.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Risk Level:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-xs`}
                    style={{
                      backgroundColor: `${getHabitationRiskColor(nearestHab.id)}20`,
                      color: getHabitationRiskColor(nearestHab.id),
                    }}
                  >
                    {RISK_LABELS[getHabitationRiskLevel(nearestHab.id)]}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Priority Rank:</span>{" "}
                  <span className="font-semibold">
                    {nearestHab.priority_rank ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {evacuationRoute && (
            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">
                Evacuation Route (Actual Network Path)
              </h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-slate-500">Route:</span>{" "}
                  <span className="font-semibold">{evacuationRoute.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  <span
                    className={`font-semibold ${evacuationRoute.status === "impassable" ? "text-red-600" : "text-green-600"}`}
                  >
                    {evacuationRoute.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Distance:</span>{" "}
                  <span className="font-semibold">
                    {evacuationRoute.length_km?.toFixed(1)} km
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Travel Time:</span>{" "}
                  <span className="font-semibold">
                    {evacuationRoute.travel_time_min?.toFixed(0)} min
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Capacity:</span>{" "}
                  <span className="font-semibold">
                    {evacuationRoute.capacity_per_hour}/hr
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Route Type:</span>{" "}
                  <span className="font-semibold capitalize">
                    {evacuationRoute.route_type}
                  </span>
                </div>
                {evacuationRoute.bridge_dependencies?.length && (
                  <div>
                    <span className="text-slate-500">Bridge Dependencies:</span>{" "}
                    <span className="font-semibold text-sm">
                      {evacuationRoute.bridge_dependencies.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {routeFeasibility && (
            <div
              className={`p-3 rounded-lg ${routeFeasibility.feasible ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
            >
              <div className="flex items-center gap-2">
                <span>{routeFeasibility.feasible ? "✅" : "❌"}</span>
                <span className="font-medium">
                  {routeFeasibility.feasible
                    ? "Route Feasible"
                    : "NO FEASIBLE EVACUATION ROUTE"}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                {routeFeasibility.reason}
              </p>
              {routeFeasibility.routeUsed && (
                <p className="text-xs text-slate-500 mt-1">
                  Route used: {routeFeasibility.routeUsed}
                </p>
              )}
            </div>
          )}

          {selectedSite && !evacuationRoute && !feasibilityLoading && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <span>⚠️</span>
                <span className="font-medium">
                  Click a site to check feasible evacuation routes from nearest
                  affected habitation
                </span>
              </div>
            </div>
          )}

          {feasibilityLoading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <span className="animate-spin">⟳</span>
                <span className="font-medium">
                  Checking route feasibility...
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
