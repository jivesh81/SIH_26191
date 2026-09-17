"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import {
  getHabitations,
  getSites,
  getRoutes,
  getActivePlan,
  checkRouteFeasibility,
  checkAllRoutesFromHabitation,
  triggerEvent,
} from "@/lib/api";

import {
  Habitation,
  Site,
  Route,
  RouteFeasibilityResponse,
  DisasterEvent,
} from "@/lib/api";

import { useMapState } from "@/context/MapStateContext";

interface MapContainerProps {
  onLoad?: (map: any) => void;
}

const BARPETA_BOUNDS: [number, number, number, number] = [
  90.5, 26.0, 91.5, 27.0,
];

const BARPETA_CENTER: [number, number] = [91.0, 26.5];

const HAZARD_COLORS = {
  flood: {
    high: "#7f1d1d",
    medium: "#dc2626",
    low: "#f97316",
  },
  erosion: {
    high: "#7c2d12",
    medium: "#ea580c",
    low: "#fb923c",
  },
  storm_surge: {
    high: "#4c1d95",
    medium: "#7e22ce",
    low: "#a855f7",
  },
};

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

function getFirstCoordinate(value: any): [number, number] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return [Number(value[0]), Number(value[1])];
  }

  for (const child of value) {
    const result = getFirstCoordinate(child);

    if (result) {
      return result;
    }
  }

  return null;
}

function collectCoordinates(value: any): Array<[number, number]> {
  if (!Array.isArray(value)) {
    return [];
  }

  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return [[Number(value[0]), Number(value[1])]];
  }

  return value.flatMap(collectCoordinates);
}

function getPointFromGeometry(geometry: any): [number, number] | null {
  if (!geometry) {
    return null;
  }

  if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
    return [Number(geometry.coordinates[0]), Number(geometry.coordinates[1])];
  }

  return getFirstCoordinate(geometry.coordinates);
}

function getFeatureCenter(geometry: any): [number, number] | null {
  if (!geometry) {
    return null;
  }

  if (geometry.type === "Point") {
    return getPointFromGeometry(geometry);
  }

  const coords = collectCoordinates(geometry.coordinates);

  if (!coords.length) {
    return null;
  }

  const lng = coords.reduce((sum, point) => sum + point[0], 0) / coords.length;

  const lat = coords.reduce((sum, point) => sum + point[1], 0) / coords.length;

  return [lng, lat];
}

function makeFeatureCollection(features: any[]) {
  return {
    type: "FeatureCollection",
    features,
  };
}

function updateSource(map: any, sourceId: string, data: any) {
  const source = map.getSource(sourceId);

  if (source) {
    source.setData(data);
  }
}

function normalizeRouteStatus(
  status: string | undefined,
): "open" | "congested" | "closed" {
  const value = String(status ?? "").toLowerCase();

  if (value === "impassable" || value === "closed" || value === "blocked") {
    return "closed";
  }

  if (value === "congested") {
    return "congested";
  }

  return "open";
}

export function MapContainer({ onLoad }: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const mapRef = useRef<any>(null);

  const routeSnapshotRef = useRef<Record<string, string>>({});

  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const planTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const routeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /*
   * Keep one AudioContext alive for the session.
   * The first user click on the page unlocks it.
   */
  const audioContextRef = useRef<AudioContext | null>(null);

  const audioUnlockedRef = useRef(false);

  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);

  const [dangerAlert, setDangerAlert] = useState<{
    routeName: string;
    routeId: string;
    message: string;
  } | null>(null);

  const [selectedRoute, setSelectedRoute] =
    useState<RouteFeasibilityResponse | null>(null);
  const [hazardZones, setHazardZones] = useState<any[]>([]);
  const [isCheckingRoute, setIsCheckingRoute] = useState(false);

  const [selectedHabitation, setSelectedHabitation] =
    useState<Habitation | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const checkRouteAndDisplay = useCallback(
    async (map: any, habitation: Habitation, site: Site) => {
      if (!habitation || !site) return;

      setIsCheckingRoute(true);
      try {
        const result = await checkRouteFeasibility(habitation.id, site.id);
        setSelectedRoute(result);

        // If feasible and route geometry exists, add it to the map as a highlighted route
        if (result.feasible && result.route_used) {
          const routeRes = await getRoutes({ open_only: false });
          const route = routeRes.routes.find(
            (r: Route) => r.id === result.route_used,
          );
          if (route?.geometry) {
            const feature = {
              type: "Feature" as const,
              geometry: route.geometry,
              properties: {
                id: route.id,
                name: route.name,
                distance_km: result.distance_km,
                travel_time_min: result.travel_time_min,
              },
            };
            const data = makeFeatureCollection([feature]);

            if (!map.getSource("selected-route")) {
              map.addSource("selected-route", { type: "geojson", data });

              map.addLayer({
                id: "selected-route",
                type: "line",
                source: "selected-route",
                paint: {
                  "line-color": "#2563eb",
                  "line-width": 5,
                  "line-opacity": 0.95,
                },
              });

              // Fit map to route
              const coords = route.geometry.coordinates;
              if (coords.length >= 2) {
                const lngs = coords.map((c: any) => c[0]);
                const lats = coords.map((c: any) => c[1]);
                map.fitBounds(
                  [
                    [Math.min(...lngs), Math.min(...lats)],
                    [Math.max(...lngs), Math.max(...lats)],
                  ],
                  { padding: 100, duration: 700 },
                );
              }
            } else {
              updateSource(map, "selected-route", data);
            }
          }
        } else {
          // Remove selected route if exists
          if (map.getLayer("selected-route")) {
            map.removeLayer("selected-route");
          }
          if (map.getSource("selected-route")) {
            map.removeSource("selected-route");
          }
        }
      } catch (error) {
        console.error("Route check failed:", error);
      } finally {
        setIsCheckingRoute(false);
      }
    },
    [],
  );

  const { selection, layerVisibility, setLayerVisibility } = useMapState();

  const [showEventPanel, setShowEventPanel] = useState(false);
  const [activeEvent, setActiveEvent] = useState<{
    type: string;
    bridgeId?: string;
    area?: any;
  } | null>(null);

  // Check route when both habitation and site are selected
  useEffect(() => {
    if (
      selection.selectedHabitationId &&
      selection.selectedSiteId &&
      mapRef.current
    ) {
      // Fetch habitation and site data
      Promise.all([
        getHabitations({ accessible_only: false }),
        getSites({ available_only: false }),
      ]).then(([habRes, siteRes]) => {
        const hab = habRes.habitations?.find(
          (h: Habitation) => h.id === selection.selectedHabitationId,
        );
        const site = siteRes.sites?.find(
          (s: Site) => s.id === selection.selectedSiteId,
        );

        if (hab) setSelectedHabitation(hab);
        if (site) setSelectedSite(site);

        if (hab && site) {
          checkRouteAndDisplay(mapRef.current, hab, site);
        }
      });
    } else {
      setSelectedHabitation(null);
      setSelectedSite(null);
      setSelectedRoute(null);
      // Remove selected route layer if exists
      if (mapRef.current?.getLayer("selected-route")) {
        mapRef.current.removeLayer("selected-route");
      }
      if (mapRef.current?.getSource("selected-route")) {
        mapRef.current.removeSource("selected-route");
      }
    }
  }, [
    selection.selectedHabitationId,
    selection.selectedSiteId,
    checkRouteAndDisplay,
  ]);

  /*
   * Create/unlock the browser audio context
   * from a genuine user interaction.
   */
  const unlockAudio = () => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;

      if (!AudioCtx) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const context = audioContextRef.current;

      if (context.state === "suspended") {
        context.resume().catch(() => {});
      }

      audioUnlockedRef.current = true;
    } catch (error) {
      console.warn("Could not unlock browser audio:", error);
    }
  };

  /*
   * Unlock audio after the first click anywhere
   * on the dashboard.
   *
   * This means the simulation button click also
   * gives the browser permission to play the
   * emergency alarm later.
   */
  useEffect(() => {
    const handleFirstUserInteraction = () => {
      unlockAudio();
    };

    document.addEventListener("click", handleFirstUserInteraction, {
      once: true,
      capture: true,
    });

    return () => {
      document.removeEventListener("click", handleFirstUserInteraction, {
        capture: true,
      });
    };
  }, []);

  /*
   * Emergency alarm:
   * 10 short BEEP sounds.
   *
   * There is NO speech and NO voice.
   */
  const playAlarm = () => {
    try {
      const context = audioContextRef.current;

      if (!context) {
        /*
         * Fallback in case no click has happened yet.
         * The user should normally have clicked the
         * dashboard before running the simulation.
         */
        unlockAudio();
      }

      const audio = audioContextRef.current;

      if (!audio) {
        console.warn("Audio context unavailable.");
        return;
      }

      const playBeepSequence = () => {
        if (audio.state === "suspended") {
          audio.resume().catch(() => {});
          return;
        }

        const startTime = audio.currentTime + 0.05;

        for (let i = 0; i < 10; i += 1) {
          const beepStart = startTime + i * 0.22;

          const oscillator = audio.createOscillator();

          const gain = audio.createGain();

          oscillator.type = "square";

          oscillator.frequency.setValueAtTime(900, beepStart);

          gain.gain.setValueAtTime(0.0001, beepStart);

          gain.gain.exponentialRampToValueAtTime(0.28, beepStart + 0.01);

          gain.gain.exponentialRampToValueAtTime(0.0001, beepStart + 0.13);

          oscillator.connect(gain);

          gain.connect(audio.destination);

          oscillator.start(beepStart);

          oscillator.stop(beepStart + 0.14);
        }
      };

      playBeepSequence();
    } catch (error) {
      console.warn("Emergency alarm unavailable:", error);
    }
  };

  const announceDanger = (route: Route) => {
    const routeName = route.name || route.id || "Evacuation route";

    setDangerAlert({
      routeName,
      routeId: route.id,
      message:
        "This evacuation path is no longer usable. The active relocation plan must be re-evaluated.",
    });

    /*
     * Play exactly 10 beeps.
     */
    playAlarm();

    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }

    alertTimerRef.current = setTimeout(() => {
      setDangerAlert(null);
    }, 9000);
  };

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) {
      return;
    }

    let disposed = false;

    import("maplibre-gl").then((maplibregl) => {
      if (disposed || !mapContainerRef.current) {
        return;
      }

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
        new MapLibre.AttributionControl({
          compact: true,
        }),
        "bottom-right",
      );

      map.addControl(
        new MapLibre.NavigationControl({
          visualizePitch: true,
        }),
        "top-right",
      );

      map.addControl(
        new MapLibre.ScaleControl({
          unit: "metric",
        }),
        "bottom-left",
      );

      map.on("load", async () => {
        onLoad?.(map);

        await loadDataLayers(map);

        startPlanPolling(map);
        startRoutePolling(map);
      });

      map.on("move", () => {
        const center = map.getCenter();

        setCoordinates([center.lng, center.lat]);

        const coordEl = document.getElementById("coordinates");

        if (coordEl) {
          coordEl.textContent = `Lat: ${center.lat.toFixed(
            4,
          )}, Lng: ${center.lng.toFixed(4)}`;
        }
      });

      /*
       * Clicking a habitation/site.
       */
      map.on("click", ["habitations", "sites-point"], (event: any) => {
        const feature = event?.features?.[0];

        if (!feature) {
          return;
        }

        const isHabitation = feature.layer?.id === "habitations";

        const title = feature.properties?.name ?? "Location";

        const detail = isHabitation
          ? `Population: ${Number(
              feature.properties?.population ?? 0,
            ).toLocaleString()}`
          : `Capacity: ${Number(
              feature.properties?.available_capacity ?? 0,
            ).toLocaleString()}`;

        new MapLibre.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: "300px",
        })
          .setLngLat(event.lngLat)
          .setHTML(
            `
                <div style="font-family:Arial,sans-serif">
                  <div style="font-weight:700;font-size:14px;margin-bottom:6px">
                    ${title}
                  </div>
                  <div style="font-size:12px;color:#475569">
                    ${detail}
                  </div>
                </div>
              `,
          )
          .addTo(map);
      });

      /*
       * Clicking a road.
       */
      map.on("click", "routes-base", (event: any) => {
        const feature = event?.features?.[0];

        if (!feature) {
          return;
        }

        const status = normalizeRouteStatus(feature.properties?.status);

        const name =
          feature.properties?.name ?? feature.properties?.id ?? "Road";

        if (status === "closed") {
          new MapLibre.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: "320px",
          })
            .setLngLat(event.lngLat)
            .setHTML(
              `
                  <div style="font-family:Arial,sans-serif">
                    <div style="color:#b91c1c;font-weight:800;font-size:14px">
                      🚨 DANGER — PATH BROKEN
                    </div>

                    <div style="font-weight:700;margin-top:6px">
                      ${name}
                    </div>

                    <div style="font-size:12px;color:#475569;margin-top:5px">
                      This path is currently blocked and should not be used for relocation.
                    </div>

                    <div style="font-size:11px;color:#64748b;margin-top:6px">
                      Aapda Setu recommends re-evaluating the active relocation plan.
                    </div>
                  </div>
                `,
            )
            .addTo(map);

          /*
           * Clicking the broken road itself is
           * a user gesture, so audio is unlocked
           * and the 10-beep alarm can play.
           */
          unlockAudio();
          playAlarm();

          return;
        }

        new MapLibre.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: "300px",
        })
          .setLngLat(event.lngLat)
          .setHTML(
            `
                <div style="font-family:Arial,sans-serif">
                  <div style="font-weight:700;font-size:14px">
                    ${name}
                  </div>

                  <div style="font-size:12px;color:#475569;margin-top:5px">
                    Route status: ${status}
                  </div>
                </div>
              `,
          )
          .addTo(map);
      });

      mapRef.current = map;
    });

    return () => {
      disposed = true;

      if (planTimerRef.current) {
        clearInterval(planTimerRef.current);

        planTimerRef.current = null;
      }

      if (routeTimerRef.current) {
        clearInterval(routeTimerRef.current);

        routeTimerRef.current = null;
      }

      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);

        alertTimerRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});

        audioContextRef.current = null;

        audioUnlockedRef.current = false;
      }
    };
  }, [onLoad]);

  const loadDataLayers = async (map: any) => {
    try {
      const [habitationsRes, sitesRes, routesRes, riskRes, hazardsRes] =
        await Promise.all([
          getHabitations({
            accessible_only: false,
          }),

          getSites({
            available_only: false,
          }),

          getRoutes({
            open_only: false,
          }),

          fetch("/api/v1/intelligence/risk")
            .then((r) => r.json())
            .catch(() => null),

          fetch("/api/v1/intelligence/hazards")
            .then((r) => r.json())
            .catch(() => null),
        ]);

      const habitations = habitationsRes.habitations ?? [];

      const sites = sitesRes.sites ?? [];

      const routes = routesRes.routes ?? [];

      const riskAssessments = riskRes?.assessments ?? [];
      const riskMap = new Map<string, string>(
        riskAssessments.map((r: any) => [r.habitation_id, r.risk_level]),
      );

      const hazards = hazardsRes?.features ?? [];
      setHazardZones(hazards);

      addHabitationLayer(map, habitations, riskMap);

      addSiteLayer(map, sites);

      addRouteLayer(map, routes);

      addHazardZonesLayer(map, hazards);

      await updatePlannedEvacuationLinks(map, habitations, sites, routes);

      fitToData(map, habitations, sites);

      snapshotRoutes(routes);
    } catch (error) {
      console.error("Error loading map data:", error);
    }
  };

  const snapshotRoutes = (routes: Route[]) => {
    const snapshot: Record<string, string> = {};

    routes.forEach((route) => {
      snapshot[route.id] = normalizeRouteStatus(route.status);
    });

    routeSnapshotRef.current = snapshot;
  };

  const checkForBrokenRoutes = (routes: Route[]) => {
    const previous = routeSnapshotRef.current;

    let newlyClosed: Route | null = null;

    routes.forEach((route) => {
      const currentStatus = normalizeRouteStatus(route.status);

      const previousStatus = previous[route.id];

      if (
        currentStatus === "closed" &&
        previousStatus &&
        previousStatus !== "closed"
      ) {
        newlyClosed = newlyClosed ?? route;
      }

      routeSnapshotRef.current[route.id] = currentStatus;
    });

    if (newlyClosed) {
      announceDanger(newlyClosed);
    }
  };

  const refreshRoutes = async (map: any) => {
    try {
      const result = await getRoutes({
        open_only: false,
      });

      const routes = result.routes ?? [];

      checkForBrokenRoutes(routes);

      addRouteLayer(map, routes);
    } catch (error) {
      console.warn("Route refresh failed:", error);
    }
  };

  const startRoutePolling = (map: any) => {
    if (routeTimerRef.current) {
      clearInterval(routeTimerRef.current);
    }

    routeTimerRef.current = setInterval(() => {
      refreshRoutes(map);
    }, 3000);
  };

  const addHabitationLayer = (
    map: any,
    habitations: Habitation[],
    riskMap: Map<string, string>,
  ) => {
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
          risk_level: riskMap.get(h.id) || "LOW",
        },
      }));

    const data = makeFeatureCollection(features);

    if (!map.getSource("habitations")) {
      map.addSource("habitations", {
        type: "geojson",
        data,
      });
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
          current_allocation: s.current_allocation,
          suitability_score: s.suitability_score,
          elevation_m: s.elevation_m,
        },
      }));

    const data = makeFeatureCollection(features);

    if (!map.getSource("sites")) {
      map.addSource("sites", {
        type: "geojson",
        data,
      });
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
      map.addSource("routes", {
        type: "geojson",
        data,
      });
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

          "line-width": 2,

          "line-dasharray": [1.5, 1.5],

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
  };

  const addHazardZonesLayer = (map: any, hazards: any[]) => {
    const features = hazards.map((h) => ({
      type: "Feature" as const,
      geometry: h.geometry,
      properties: {
        id: h.properties?.id ?? h.id,
        hazard_type: h.properties?.hazard_type ?? "flood",
        severity: h.properties?.severity ?? "low",
      },
    }));

    const data = makeFeatureCollection(features);

    if (!map.getSource("hazard-zones")) {
      map.addSource("hazard-zones", {
        type: "geojson",
        data,
      });
    } else {
      updateSource(map, "hazard-zones", data);
    }

    // Flood zones
    if (!map.getLayer("hazard-flood")) {
      map.addLayer({
        id: "hazard-flood",
        type: "fill",
        source: "hazard-zones",
        filter: ["==", ["get", "hazard_type"], "flood"],
        paint: {
          "fill-color": [
            "match",
            ["get", "severity"],
            "high",
            HAZARD_COLORS.flood.high,
            "medium",
            HAZARD_COLORS.flood.medium,
            "low",
            HAZARD_COLORS.flood.low,
            HAZARD_COLORS.flood.low,
          ],
          "fill-opacity": 0.25,
          "fill-outline-color": [
            "match",
            ["get", "severity"],
            "high",
            HAZARD_COLORS.flood.high,
            "medium",
            HAZARD_COLORS.flood.medium,
            "low",
            HAZARD_COLORS.flood.low,
            HAZARD_COLORS.flood.low,
          ],
        },
      });
    }

    // Erosion zones
    if (!map.getLayer("hazard-erosion")) {
      map.addLayer({
        id: "hazard-erosion",
        type: "fill",
        source: "hazard-zones",
        filter: ["==", ["get", "hazard_type"], "erosion"],
        paint: {
          "fill-color": [
            "match",
            ["get", "severity"],
            "high",
            HAZARD_COLORS.erosion.high,
            "medium",
            HAZARD_COLORS.erosion.medium,
            "low",
            HAZARD_COLORS.erosion.low,
            HAZARD_COLORS.erosion.low,
          ],
          "fill-opacity": 0.25,
          "fill-outline-color": [
            "match",
            ["get", "severity"],
            "high",
            HAZARD_COLORS.erosion.high,
            "medium",
            HAZARD_COLORS.erosion.medium,
            "low",
            HAZARD_COLORS.erosion.low,
            HAZARD_COLORS.erosion.low,
          ],
        },
      });
    }

    // Storm surge zones
    if (!map.getLayer("hazard-storm-surge")) {
      map.addLayer({
        id: "hazard-storm-surge",
        type: "fill",
        source: "hazard-zones",
        filter: ["==", ["get", "hazard_type"], "storm_surge"],
        paint: {
          "fill-color": [
            "match",
            ["get", "severity"],
            "high",
            HAZARD_COLORS.storm_surge.high,
            "medium",
            HAZARD_COLORS.storm_surge.medium,
            "low",
            HAZARD_COLORS.storm_surge.low,
            HAZARD_COLORS.storm_surge.low,
          ],
          "fill-opacity": 0.25,
          "fill-outline-color": [
            "match",
            ["get", "severity"],
            "high",
            HAZARD_COLORS.storm_surge.high,
            "medium",
            HAZARD_COLORS.storm_surge.medium,
            "low",
            HAZARD_COLORS.storm_surge.low,
            HAZARD_COLORS.storm_surge.low,
          ],
        },
      });
    }
  };

  const updatePlannedEvacuationLinks = async (
    map: any,
    habitations: Habitation[],
    sites: Site[],
    routes: Route[],
  ) => {
    try {
      const activePlan = await getActivePlan();

      const plan = activePlan?.plan;

      const assignments = plan?.assignments ?? [];

      const habitationMap = new Map<string, Habitation>();

      habitations.forEach((habitation) => {
        habitationMap.set(habitation.id, habitation);
      });

      const siteMap = new Map<string, Site>();

      sites.forEach((site) => {
        siteMap.set(site.id, site);
      });

      const routeMap = new Map<string, Route>();
      routes.forEach((route) => {
        routeMap.set(route.id, route);
      });

      const features = assignments
        .map((assignment: any) => {
          const habitation = habitationMap.get(assignment.habitation_id);

          const siteId = assignment.site_id ?? assignment.assigned_site_id;

          const site = siteMap.get(siteId);

          const routeId =
            assignment.route_id ?? habitation?.evacuation_route_id;

          const route = routeId ? routeMap.get(routeId) : null;

          if (!habitation?.geometry || !site?.geometry || !route?.geometry) {
            return null;
          }

          return {
            type: "Feature" as const,

            geometry: route.geometry,

            properties: {
              habitation_id: assignment.habitation_id,

              site_id: siteId,

              route_id: route.id,

              route_name: route.name,

              route_status: route.status,

              households: assignment.households ?? assignment.population ?? 0,

              distance_km: assignment.distance_km ?? route.length_km ?? null,
            },
          };
        })
        .filter(Boolean);

      const data = makeFeatureCollection(features);

      if (!map.getSource("planned-evacuation")) {
        map.addSource("planned-evacuation", {
          type: "geojson",
          data,
        });
      } else {
        updateSource(map, "planned-evacuation", data);
      }

      if (!map.getLayer("planned-evacuation-shadow")) {
        map.addLayer({
          id: "planned-evacuation-shadow",
          type: "line",
          source: "planned-evacuation",

          paint: {
            "line-color": COLORS.evacuationOutline,

            "line-width": 6,
            "line-opacity": 0.9,
          },
        });
      }

      if (!map.getLayer("planned-evacuation")) {
        map.addLayer({
          id: "planned-evacuation",
          type: "line",
          source: "planned-evacuation",

          paint: {
            "line-color": COLORS.evacuation,

            "line-width": 3,

            "line-dasharray": [4, 2],

            "line-opacity": 0.95,
          },
        });
      }
    } catch (error) {
      console.warn("Could not load planned evacuation links:", error);
    }
  };

  const fitToData = (map: any, habitations: Habitation[], sites: Site[]) => {
    const points: Array<[number, number]> = [];

    [...habitations, ...sites].forEach((item: any) => {
      const point = getFeatureCenter(item.geometry);

      if (point) {
        points.push(point);
      }
    });

    if (points.length < 2) {
      return;
    }

    const lngs = points.map((point) => point[0]);

    const lats = points.map((point) => point[1]);

    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: 80,
        duration: 700,
        maxZoom: 12,
      },
    );
  };

  const startPlanPolling = (map: any) => {
    if (planTimerRef.current) {
      clearInterval(planTimerRef.current);
    }

    planTimerRef.current = setInterval(async () => {
      try {
        const [habitationsRes, sitesRes, routesRes] = await Promise.all([
          getHabitations({
            accessible_only: false,
          }),

          getSites({
            available_only: false,
          }),

          getRoutes({
            open_only: false,
          }),
        ]);

        await updatePlannedEvacuationLinks(
          map,
          habitationsRes.habitations ?? [],
          sitesRes.sites ?? [],
          routesRes.routes ?? [],
        );
      } catch (error) {
        console.warn("Plan refresh failed:", error);
      }
    }, 5000);
  };

  const triggerDisasterEvent = useCallback(
    async (event: DisasterEvent) => {
      try {
        const result = await triggerEvent(event);

        if (result.plan_invalidated) {
          // Show event feedback
          setActiveEvent({
            type: event.event_type,
            bridgeId: event.metadata?.bridge_id,
            area: event.affected_area,
          });

          // Refresh routes after event
          if (mapRef.current) {
            await refreshRoutes(mapRef.current);
            await updatePlannedEvacuationLinks(
              mapRef.current,
              (await getHabitations({ accessible_only: false })).habitations ??
                [],
              (await getSites({ available_only: false })).sites ?? [],
              (await getRoutes({ open_only: false })).routes ?? [],
            );

            // Re-check route if habitation and site are selected
            if (selection.selectedHabitationId && selection.selectedSiteId) {
              const [habRes, siteRes] = await Promise.all([
                getHabitations({ accessible_only: false }),
                getSites({ available_only: false }),
              ]);
              const hab = habRes.habitations?.find(
                (h: Habitation) => h.id === selection.selectedHabitationId,
              );
              const site = siteRes.sites?.find(
                (s: Site) => s.id === selection.selectedSiteId,
              );
              if (hab && site) {
                checkRouteAndDisplay(mapRef.current, hab, site);
              }
            }
          }

          // Auto-hide event panel after 5 seconds
          setTimeout(() => setActiveEvent(null), 5000);
        }
      } catch (error) {
        console.error("Event trigger failed:", error);
      }
    },
    [
      selection.selectedHabitationId,
      selection.selectedSiteId,
      checkRouteAndDisplay,
    ],
  );

  return (
    <div
      ref={mapContainerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        width: "100%",
        height: "100%",
      }}
      aria-label="Barpeta district disaster management map"
    >
      {/* Emergency warning */}
      {dangerAlert && (
        <div className="absolute left-1/2 top-4 z-50 w-[min(92%,560px)] -translate-x-1/2">
          <div className="rounded-xl border-2 border-red-600 bg-red-600 text-white shadow-2xl p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🚨</div>

              <div className="flex-1">
                <div className="font-extrabold text-lg tracking-wide">
                  DANGER — PATH BROKEN
                </div>

                <div className="font-semibold text-sm mt-1">
                  {dangerAlert.routeName}
                </div>

                <div className="text-xs text-red-100 mt-1">
                  {dangerAlert.message}
                </div>

                <div className="text-[11px] text-red-100 mt-2">
                  Route ID: {dangerAlert.routeId}
                </div>

                <div className="text-[11px] font-semibold text-white mt-2">
                  🔊 10-BEEP EMERGENCY ALERT · Alternative relocation route
                  required
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDangerAlert(null)}
                className="text-white/80 hover:text-white text-xl leading-none"
                aria-label="Close alert"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map title */}
      <div className="absolute left-3 top-3 z-10 px-3 py-1.5 rounded-md bg-slate-900/85 text-white text-[11px] font-medium shadow">
        Barpeta · Disaster Decision Map
      </div>

      {/* Layer Controls */}
      <div className="absolute right-3 top-3 z-10 bg-white/95 backdrop-blur rounded-lg shadow-lg border border-slate-200 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-800">
            Map Layers
          </span>
          <button
            onClick={() => setShowEventPanel(!showEventPanel)}
            className="ml-auto p-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Event simulation"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layerVisibility.habitations}
              onChange={(e) =>
                setLayerVisibility({ habitations: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-700">Vulnerable Habitations</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layerVisibility.sites}
              onChange={(e) => setLayerVisibility({ sites: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-700">Relocation Sites</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layerVisibility.routes}
              onChange={(e) => setLayerVisibility({ routes: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-700">Roads / Routes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layerVisibility.hazardZones}
              onChange={(e) =>
                setLayerVisibility({ hazardZones: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-700">Risk / Hazard Zones</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layerVisibility.plannedEvacuation}
              onChange={(e) =>
                setLayerVisibility({ plannedEvacuation: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-700">Evacuation Routes</span>
          </label>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute left-3 bottom-3 z-10 bg-white/95 backdrop-blur rounded-lg shadow-md border border-slate-200 px-3 py-2">
        <div className="text-xs font-semibold text-slate-800 mb-2">
          Map Legend
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-700">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                background: RISK_COLORS.RED_ZONE,
              }}
            />
            RED ZONE
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                background: RISK_COLORS.HIGH,
              }}
            />
            HIGH
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                background: RISK_COLORS.MEDIUM,
              }}
            />
            MEDIUM
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                background: RISK_COLORS.LOW,
              }}
            />
            LOW
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                background: COLORS.site,
              }}
            />
            Relocation site
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-6 h-0.5"
              style={{
                background: COLORS.routeOpen,
              }}
            />
            Open road
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-6 h-0.5"
              style={{
                background: COLORS.routeClosed,
              }}
            />
            Blocked road
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-6 border-t-2 border-dashed"
              style={{
                borderColor: COLORS.evacuation,
              }}
            />
            Evacuation route
          </div>
        </div>
      </div>

      {/* Route Details Panel */}
      {selectedRoute && (
        <div className="absolute right-3 top-3 z-10 w-80 max-h-[70vh] overflow-y-auto bg-white/95 backdrop-blur rounded-lg shadow-xl border border-slate-200 p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Route Details</h3>
            <button
              onClick={() => {
                setSelectedRoute(null);
                if (mapRef.current?.getLayer("selected-route")) {
                  mapRef.current.removeLayer("selected-route");
                }
                if (mapRef.current?.getSource("selected-route")) {
                  mapRef.current.removeSource("selected-route");
                }
              }}
              className="text-slate-500 hover:text-slate-900 text-xl leading-none"
              aria-label="Close route details"
            >
              ×
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19v2m0 0H9m3 0h3"
                  />
                </svg>
              </div>
              <div>
                <div className="font-medium text-slate-900">
                  {selectedHabitation?.name || "Habitation"}
                </div>
                <div className="text-xs text-slate-500">FROM</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-0.5 bg-blue-500" />
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="flex-1 h-0.5 bg-blue-500" />
            </div>

            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <div className="font-medium text-slate-900">
                  {selectedSite?.name || "Site"}
                </div>
                <div className="text-xs text-slate-500">TO</div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Status</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-xs ${
                    selectedRoute.feasible
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {selectedRoute.feasible ? "FEASIBLE" : "NOT FEASIBLE"}
                </span>
              </div>

              {selectedRoute.distance_km && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Distance</span>
                  <span className="font-medium text-slate-900">
                    {selectedRoute.distance_km.toFixed(1)} km
                  </span>
                </div>
              )}

              {selectedRoute.travel_time_min && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Travel Time</span>
                  <span className="font-medium text-slate-900">
                    {Math.round(selectedRoute.travel_time_min)} min
                  </span>
                </div>
              )}

              {selectedRoute.route_used && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Route</span>
                  <span className="font-medium text-slate-900 truncate max-w-[160px]">
                    {selectedRoute.route_used}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-600">Reason</span>
                <span className="font-medium text-slate-900 truncate max-w-[160px] text-left">
                  {selectedRoute.reason}
                </span>
              </div>

              {selectedRoute.bottlenecks &&
                selectedRoute.bottlenecks.length > 0 && (
                  <div className="border-t border-slate-200 pt-2">
                    <div className="text-xs text-slate-500 mb-1">
                      Bottlenecks / Bridge Dependencies:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedRoute.bottlenecks.map((b: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Route Checking Loading */}
      {isCheckingRoute && !selectedRoute && (
        <div className="absolute right-3 top-3 z-10 w-72 bg-white/95 backdrop-blur rounded-lg shadow-xl border border-slate-200 p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="font-medium text-slate-700">
              Checking route feasibility...
            </span>
          </div>
        </div>
      )}

      {/* Event Simulation Panel */}
      {showEventPanel && (
        <div className="absolute right-3 top-48 z-10 w-72 bg-white/95 backdrop-blur rounded-lg shadow-xl border border-slate-200 p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">
              Disaster Simulation
            </h3>
            <button
              onClick={() => setShowEventPanel(false)}
              className="text-slate-500 hover:text-slate-900 text-xl leading-none"
              aria-label="Close event panel"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-medium text-red-800 mb-2">
                Bridge Collapse
              </div>
              <div className="text-xs text-red-700 mb-2">
                Simulate bridge collapse to test route re-optimization
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() =>
                    triggerDisasterEvent({
                      event_type: "bridge_collapse",
                      metadata: { bridge_id: "bridge_beki" },
                    })
                  }
                  className="w-full text-left px-3 py-2 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                >
                  Beki River Bridge (NH-31) — Affects Barpeta routes
                </button>
                <button
                  onClick={() =>
                    triggerDisasterEvent({
                      event_type: "bridge_collapse",
                      metadata: { bridge_id: "bridge_chaulkhowa" },
                    })
                  }
                  className="w-full text-left px-3 py-2 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                >
                  Chaulkhowa Bridge (SH-15) — Affects Howly/Pathsala routes
                </button>
                <button
                  onClick={() =>
                    triggerDisasterEvent({
                      event_type: "bridge_collapse",
                      metadata: { bridge_id: "bridge_kaldia" },
                    })
                  }
                  className="w-full text-left px-3 py-2 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                >
                  Kaldia River Bridge — Affects Mandia/Goberadhana routes
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="font-medium text-amber-800 mb-2">
                Shelter Capacity Reduction
              </div>
              <div className="text-xs text-amber-700 mb-2">
                Simulate shelter capacity reduction
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() =>
                    triggerDisasterEvent({
                      event_type: "capacity_reduction",
                      metadata: {
                        shelter_ids: ["shelter_rc_barpeta", "shelter_rc_howly"],
                        reduction_pct: 50,
                      },
                    })
                  }
                  className="w-full text-left px-3 py-2 text-xs bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
                >
                  Barpeta & Howly shelters — 50% capacity reduction
                </button>
                <button
                  onClick={() =>
                    triggerDisasterEvent({
                      event_type: "capacity_reduction",
                      metadata: {
                        shelter_ids: ["shelter_rc_mandia", "shelter_rc_chenga"],
                        reduction_pct: 75,
                      },
                    })
                  }
                  className="w-full text-left px-3 py-2 text-xs bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
                >
                  Mandia & Chenga shelters — 75% capacity reduction
                </button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-800 mb-2">
                Rainfall Event
              </div>
              <div className="text-xs text-blue-700 mb-2">
                Simulate heavy rainfall increasing flood risk
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() =>
                    triggerDisasterEvent({
                      event_type: "rainfall",
                      intensity: 150,
                      duration_hours: 24,
                      affected_area: {
                        min_lng: 90.5,
                        min_lat: 26.0,
                        max_lng: 91.5,
                        max_lat: 27.0,
                      },
                    })
                  }
                  className="w-full text-left px-3 py-2 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                >
                  Heavy rainfall (150mm/24h) — District-wide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Event Notification */}
      {activeEvent && (
        <div className="absolute left-1/2 top-16 z-50 w-[min(92%,480px)] -translate-x-1/2 animate-slide-up">
          <div className="rounded-xl border-2 border-amber-500 bg-amber-50 text-amber-900 shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <div className="font-extrabold text-base tracking-wide">
                  EVENT SIMULATED:{" "}
                  {activeEvent.type.toUpperCase().replace("_", " ")}
                </div>
                {activeEvent.bridgeId && (
                  <div className="text-sm mt-1">
                    Bridge affected:{" "}
                    <span className="font-mono">{activeEvent.bridgeId}</span>
                  </div>
                )}
                <div className="text-xs text-amber-700 mt-2">
                  Routes updated. Re-optimization triggered. Check route status.
                </div>
              </div>
              <button
                onClick={() => setActiveEvent(null)}
                className="text-amber-700 hover:text-amber-900 text-xl leading-none"
                aria-label="Close event notification"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
