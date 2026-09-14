'use client';

import { useEffect, useRef, useState } from 'react';

import {
  getHabitations,
  getSites,
  getRoutes,
  getActivePlan,
} from '@/lib/api';

import {
  Habitation,
  Site,
  Route,
} from '@/lib/api';

interface MapContainerProps {
  onLoad?: (map: any) => void;
}

const BARPETA_BOUNDS: [
  number,
  number,
  number,
  number
] = [90.5, 26.0, 91.5, 27.0];

const BARPETA_CENTER: [
  number,
  number
] = [91.0, 26.5];

const RISK_COLORS = {
  RED_ZONE: '#991b1b',
  HIGH: '#dc2626',
  MEDIUM: '#f97316',
  LOW: '#16a34a',
};

const COLORS = {
  site: '#059669',
  routeOpen: '#16a34a',
  routeCongested: '#f97316',
  routeClosed: '#dc2626',
  evacuation: '#2563eb',
  evacuationOutline: '#ffffff',
  text: '#0f172a',
};

function getFirstCoordinate(
  value: any
): [number, number] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return [
      Number(value[0]),
      Number(value[1]),
    ];
  }

  for (const child of value) {
    const result = getFirstCoordinate(child);

    if (result) {
      return result;
    }
  }

  return null;
}

function collectCoordinates(
  value: any
): Array<[number, number]> {
  if (!Array.isArray(value)) {
    return [];
  }

  if (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return [[
      Number(value[0]),
      Number(value[1]),
    ]];
  }

  return value.flatMap(collectCoordinates);
}

function getPointFromGeometry(
  geometry: any
): [number, number] | null {
  if (!geometry) {
    return null;
  }

  if (
    geometry.type === 'Point' &&
    Array.isArray(geometry.coordinates)
  ) {
    return [
      Number(geometry.coordinates[0]),
      Number(geometry.coordinates[1]),
    ];
  }

  return getFirstCoordinate(
    geometry.coordinates
  );
}

function getFeatureCenter(
  geometry: any
): [number, number] | null {
  if (!geometry) {
    return null;
  }

  if (geometry.type === 'Point') {
    return getPointFromGeometry(geometry);
  }

  const coords = collectCoordinates(
    geometry.coordinates
  );

  if (!coords.length) {
    return null;
  }

  const lng =
    coords.reduce(
      (sum, point) => sum + point[0],
      0
    ) / coords.length;

  const lat =
    coords.reduce(
      (sum, point) => sum + point[1],
      0
    ) / coords.length;

  return [lng, lat];
}

function makeFeatureCollection(
  features: any[]
) {
  return {
    type: 'FeatureCollection',
    features,
  };
}

function updateSource(
  map: any,
  sourceId: string,
  data: any
) {
  const source = map.getSource(sourceId);

  if (source) {
    source.setData(data);
  }
}

function normalizeRouteStatus(
  status: string | undefined
): 'open' | 'congested' | 'closed' {
  const value = String(status ?? '').toLowerCase();

  if (
    value === 'impassable' ||
    value === 'closed' ||
    value === 'blocked'
  ) {
    return 'closed';
  }

  if (value === 'congested') {
    return 'congested';
  }

  return 'open';
}

export function MapContainer({
  onLoad,
}: MapContainerProps) {
  const mapContainerRef =
    useRef<HTMLDivElement>(null);

  const mapRef = useRef<any>(null);

  const routeSnapshotRef =
    useRef<Record<string, string>>({});

  const alertTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const planTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const routeTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  /*
   * Keep one AudioContext alive for the session.
   * The first user click on the page unlocks it.
   */
  const audioContextRef =
    useRef<AudioContext | null>(null);

  const audioUnlockedRef =
    useRef(false);

  const [coordinates, setCoordinates] =
    useState<[number, number] | null>(null);

  const [dangerAlert, setDangerAlert] =
    useState<{
      routeName: string;
      routeId: string;
      message: string;
    } | null>(null);

  /*
   * Create/unlock the browser audio context
   * from a genuine user interaction.
   */
  const unlockAudio = () => {
    try {
      if (
        typeof window === 'undefined'
      ) {
        return;
      }

      const AudioCtx =
        window.AudioContext ||
        (window as any).webkitAudioContext;

      if (!AudioCtx) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current =
          new AudioCtx();
      }

      const context =
        audioContextRef.current;

      if (context.state === 'suspended') {
        context.resume().catch(() => { });
      }

      audioUnlockedRef.current = true;
    } catch (error) {
      console.warn(
        'Could not unlock browser audio:',
        error
      );
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

    document.addEventListener(
      'click',
      handleFirstUserInteraction,
      {
        once: true,
        capture: true,
      }
    );

    return () => {
      document.removeEventListener(
        'click',
        handleFirstUserInteraction,
        {
          capture: true,
        }
      );
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
      const context =
        audioContextRef.current;

      if (!context) {
        /*
         * Fallback in case no click has happened yet.
         * The user should normally have clicked the
         * dashboard before running the simulation.
         */
        unlockAudio();
      }

      const audio =
        audioContextRef.current;

      if (!audio) {
        console.warn(
          'Audio context unavailable.'
        );
        return;
      }

      const playBeepSequence = () => {
        if (audio.state === 'suspended') {
          audio.resume().catch(() => { });
          return;
        }

        const startTime =
          audio.currentTime + 0.05;

        for (
          let i = 0;
          i < 10;
          i += 1
        ) {
          const beepStart =
            startTime + i * 0.22;

          const oscillator =
            audio.createOscillator();

          const gain =
            audio.createGain();

          oscillator.type =
            'square';

          oscillator.frequency.setValueAtTime(
            900,
            beepStart
          );

          gain.gain.setValueAtTime(
            0.0001,
            beepStart
          );

          gain.gain.exponentialRampToValueAtTime(
            0.28,
            beepStart + 0.01
          );

          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            beepStart + 0.13
          );

          oscillator.connect(gain);

          gain.connect(
            audio.destination
          );

          oscillator.start(
            beepStart
          );

          oscillator.stop(
            beepStart + 0.14
          );
        }
      };

      playBeepSequence();
    } catch (error) {
      console.warn(
        'Emergency alarm unavailable:',
        error
      );
    }
  };

  const announceDanger = (
    route: Route
  ) => {
    const routeName =
      route.name ||
      route.id ||
      'Evacuation route';

    setDangerAlert({
      routeName,
      routeId: route.id,
      message:
        'This evacuation path is no longer usable. The active relocation plan must be re-evaluated.',
    });

    /*
     * Play exactly 10 beeps.
     */
    playAlarm();

    if (alertTimerRef.current) {
      clearTimeout(
        alertTimerRef.current
      );
    }

    alertTimerRef.current =
      setTimeout(() => {
        setDangerAlert(null);
      }, 9000);
  };

  useEffect(() => {
    if (
      mapRef.current ||
      !mapContainerRef.current
    ) {
      return;
    }

    let disposed = false;

    import('maplibre-gl').then(
      (maplibregl) => {
        if (
          disposed ||
          !mapContainerRef.current
        ) {
          return;
        }

        const MapLibre =
          maplibregl.default;

        const map =
          new MapLibre.Map({
            container:
              mapContainerRef.current,

            style: {
              version: 8,

              sources: {
                osm: {
                  type: 'raster',
                  tiles: [
                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  ],
                  tileSize: 256,
                  attribution:
                    '© OpenStreetMap contributors',
                  maxzoom: 19,
                },
              },

              layers: [
                {
                  id: 'osm-base',
                  type: 'raster',
                  source: 'osm',
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
          'bottom-right'
        );

        map.addControl(
          new MapLibre.NavigationControl({
            visualizePitch: true,
          }),
          'top-right'
        );

        map.addControl(
          new MapLibre.ScaleControl({
            unit: 'metric',
          }),
          'bottom-left'
        );

        map.on('load', async () => {
          onLoad?.(map);

          await loadDataLayers(map);

          startPlanPolling(map);
          startRoutePolling(map);
        });

        map.on('move', () => {
          const center =
            map.getCenter();

          setCoordinates([
            center.lng,
            center.lat,
          ]);

          const coordEl =
            document.getElementById(
              'coordinates'
            );

          if (coordEl) {
            coordEl.textContent =
              `Lat: ${center.lat.toFixed(
                4
              )}, Lng: ${center.lng.toFixed(
                4
              )}`;
          }
        });

        /*
         * Clicking a habitation/site.
         */
        map.on(
          'click',
          [
            'habitations',
            'sites-point',
          ],
          (event: any) => {
            const feature =
              event?.features?.[0];

            if (!feature) {
              return;
            }

            const isHabitation =
              feature.layer?.id ===
              'habitations';

            const title =
              feature.properties?.name ??
              'Location';

            const detail =
              isHabitation
                ? `Population: ${Number(
                  feature.properties
                    ?.population ?? 0
                ).toLocaleString()}`
                : `Capacity: ${Number(
                  feature.properties
                    ?.available_capacity ?? 0
                ).toLocaleString()}`;

            new MapLibre.Popup({
              closeButton: true,
              closeOnClick: true,
              maxWidth: '300px',
            })
              .setLngLat(event.lngLat)
              .setHTML(`
                <div style="font-family:Arial,sans-serif">
                  <div style="font-weight:700;font-size:14px;margin-bottom:6px">
                    ${title}
                  </div>
                  <div style="font-size:12px;color:#475569">
                    ${detail}
                  </div>
                </div>
              `)
              .addTo(map);
          }
        );

        /*
         * Clicking a road.
         */
        map.on(
          'click',
          'routes-base',
          (event: any) => {
            const feature =
              event?.features?.[0];

            if (!feature) {
              return;
            }

            const status =
              normalizeRouteStatus(
                feature.properties?.status
              );

            const name =
              feature.properties?.name ??
              feature.properties?.id ??
              'Road';

            if (
              status === 'closed'
            ) {
              new MapLibre.Popup({
                closeButton: true,
                closeOnClick: true,
                maxWidth: '320px',
              })
                .setLngLat(event.lngLat)
                .setHTML(`
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
                `)
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
              maxWidth: '300px',
            })
              .setLngLat(event.lngLat)
              .setHTML(`
                <div style="font-family:Arial,sans-serif">
                  <div style="font-weight:700;font-size:14px">
                    ${name}
                  </div>

                  <div style="font-size:12px;color:#475569;margin-top:5px">
                    Route status: ${status}
                  </div>
                </div>
              `)
              .addTo(map);
          }
        );

        mapRef.current = map;
      }
    );

    return () => {
      disposed = true;

      if (
        planTimerRef.current
      ) {
        clearInterval(
          planTimerRef.current
        );

        planTimerRef.current = null;
      }

      if (
        routeTimerRef.current
      ) {
        clearInterval(
          routeTimerRef.current
        );

        routeTimerRef.current = null;
      }

      if (
        alertTimerRef.current
      ) {
        clearTimeout(
          alertTimerRef.current
        );

        alertTimerRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      if (
        audioContextRef.current
      ) {
        audioContextRef.current
          .close()
          .catch(() => { });

        audioContextRef.current =
          null;

        audioUnlockedRef.current =
          false;
      }
    };
  }, [onLoad]);

  const loadDataLayers = async (
    map: any
  ) => {
    try {
      const [
        habitationsRes,
        sitesRes,
        routesRes,
        riskRes,
      ] = await Promise.all([
        getHabitations({
          accessible_only: false,
        }),

        getSites({
          available_only: false,
        }),

        getRoutes({
          open_only: false,
        }),

        fetch('/api/v1/intelligence/risk').then(r => r.json()).catch(() => null),
      ]);

      const habitations =
        habitationsRes.habitations ?? [];

      const sites =
        sitesRes.sites ?? [];

      const routes =
        routesRes.routes ?? [];

      const riskAssessments = riskRes?.assessments ?? [];
      const riskMap = new Map<string, string>(riskAssessments.map((r: any) => [r.habitation_id, r.risk_level]));

      addHabitationLayer(
        map,
        habitations,
        riskMap
      );

      addSiteLayer(
        map,
        sites
      );

      addRouteLayer(
        map,
        routes
      );

      await updatePlannedEvacuationLinks(
        map,
        habitations,
        sites,
        routes
      );

      fitToData(
        map,
        habitations,
        sites
      );

      snapshotRoutes(routes);
    } catch (error) {
      console.error(
        'Error loading map data:',
        error
      );
    }
  };

  const snapshotRoutes = (
    routes: Route[]
  ) => {
    const snapshot: Record<
      string,
      string
    > = {};

    routes.forEach((route) => {
      snapshot[route.id] =
        normalizeRouteStatus(
          route.status
        );
    });

    routeSnapshotRef.current =
      snapshot;
  };

  const checkForBrokenRoutes = (
    routes: Route[]
  ) => {
    const previous =
      routeSnapshotRef.current;

    let newlyClosed:
      | Route
      | null = null;

    routes.forEach((route) => {
      const currentStatus =
        normalizeRouteStatus(
          route.status
        );

      const previousStatus =
        previous[route.id];

      if (
        currentStatus === 'closed' &&
        previousStatus &&
        previousStatus !== 'closed'
      ) {
        newlyClosed =
          newlyClosed ?? route;
      }

      routeSnapshotRef.current[
        route.id
      ] = currentStatus;
    });

    if (newlyClosed) {
      announceDanger(newlyClosed);
    }
  };

  const refreshRoutes = async (
    map: any
  ) => {
    try {
      const result =
        await getRoutes({
          open_only: false,
        });

      const routes =
        result.routes ?? [];

      checkForBrokenRoutes(routes);

      addRouteLayer(
        map,
        routes
      );
    } catch (error) {
      console.warn(
        'Route refresh failed:',
        error
      );
    }
  };

  const startRoutePolling = (
    map: any
  ) => {
    if (
      routeTimerRef.current
    ) {
      clearInterval(
        routeTimerRef.current
      );
    }

    routeTimerRef.current =
      setInterval(() => {
        refreshRoutes(map);
      }, 3000);
  };

  const addHabitationLayer = (
    map: any,
    habitations: Habitation[],
    riskMap: Map<string, string>
  ) => {
    const features =
      habitations
        .filter(
          (h) => h.geometry
        )
        .map((h) => ({
          type: 'Feature' as const,
          geometry: h.geometry,
          properties: {
            id: h.id,
            name: h.name,
            population:
              h.population,
            vulnerability_score:
              h.vulnerability_score,
            priority_rank:
              h.priority_rank,
            risk_level: riskMap.get(h.id) || 'LOW',
          },
        }));

    const data =
      makeFeatureCollection(
        features
      );

    if (
      !map.getSource(
        'habitations'
      )
    ) {
      map.addSource(
        'habitations',
        {
          type: 'geojson',
          data,
        }
      );
    } else {
      updateSource(
        map,
        'habitations',
        data
      );
    }

    if (
      !map.getLayer(
        'habitations'
      )
    ) {
      map.addLayer({
        id: 'habitations',
        type: 'circle',
        source: 'habitations',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'population'],
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

          'circle-color': [
            'match',
            ['get', 'risk_level'],
            'RED_ZONE', RISK_COLORS.RED_ZONE,
            'HIGH', RISK_COLORS.HIGH,
            'MEDIUM', RISK_COLORS.MEDIUM,
            RISK_COLORS.LOW
          ],

          'circle-stroke-color':
            '#ffffff',

          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
        } as any,
      });
    }

    if (
      !map.getLayer(
        'habitation-labels'
      )
    ) {
      map.addLayer({
        id: 'habitation-labels',
        type: 'symbol',
        source: 'habitations',

        filter: [
          '<=',
          ['get', 'priority_rank'],
          10,
        ],

        layout: {
          'text-field': [
            'get',
            'name',
          ],

          'text-size': 10,

          'text-offset': [
            0,
            1.4,
          ],

          'text-anchor': 'top',
        },

        paint: {
          'text-color':
            COLORS.text,

          'text-halo-color':
            '#ffffff',

          'text-halo-width': 1.5,
        },
      });
    }
  };

  const addSiteLayer = (
    map: any,
    sites: Site[]
  ) => {
    const features =
      sites
        .filter(
          (s) => s.geometry
        )
        .map((s) => ({
          type: 'Feature' as const,
          geometry: s.geometry,
          properties: {
            id: s.id,
            name: s.name,
            max_capacity:
              s.max_capacity,
            available_capacity:
              s.available_capacity,
            current_allocation:
              s.current_allocation,
            suitability_score:
              s.suitability_score,
            elevation_m:
              s.elevation_m,
          },
        }));

    const data =
      makeFeatureCollection(
        features
      );

    if (
      !map.getSource('sites')
    ) {
      map.addSource('sites', {
        type: 'geojson',
        data,
      });
    } else {
      updateSource(
        map,
        'sites',
        data
      );
    }

    if (
      !map.getLayer(
        'sites-polygon'
      )
    ) {
      map.addLayer({
        id: 'sites-polygon',
        type: 'fill',
        source: 'sites',

        filter: [
          '==',
          ['geometry-type'],
          'Polygon',
        ],

        paint: {
          'fill-color':
            COLORS.site,

          'fill-opacity': 0.18,

          'fill-outline-color':
            COLORS.site,
        },
      });
    }

    if (
      !map.getLayer(
        'sites-point'
      )
    ) {
      map.addLayer({
        id: 'sites-point',
        type: 'circle',
        source: 'sites',

        paint: {
          'circle-radius': 10,
          'circle-color':
            COLORS.site,

          'circle-stroke-color':
            '#ffffff',

          'circle-stroke-width': 2,
        },
      });
    }

    if (
      !map.getLayer(
        'site-labels'
      )
    ) {
      map.addLayer({
        id: 'site-labels',
        type: 'symbol',
        source: 'sites',

        layout: {
          'text-field': [
            'get',
            'name',
          ],

          'text-size': 10,

          'text-offset': [
            0,
            -1.4,
          ],

          'text-anchor':
            'bottom',
        },

        paint: {
          'text-color':
            '#065f46',

          'text-halo-color':
            '#ffffff',

          'text-halo-width': 1.5,
        },
      });
    }
  };

  const addRouteLayer = (
    map: any,
    routes: Route[]
  ) => {
    const features =
      routes
        .filter(
          (r) => r.geometry
        )
        .map((r) => ({
          type: 'Feature' as const,

          geometry:
            r.geometry,

          properties: {
            id: r.id,
            name: r.name,
            route_type:
              r.route_type,
            status:
              r.status,
          },
        }));

    const data =
      makeFeatureCollection(
        features
      );

    if (
      !map.getSource('routes')
    ) {
      map.addSource('routes', {
        type: 'geojson',
        data,
      });
    } else {
      updateSource(
        map,
        'routes',
        data
      );
    }

    if (
      !map.getLayer(
        'routes-base'
      )
    ) {
      map.addLayer({
        id: 'routes-base',
        type: 'line',
        source: 'routes',

        paint: {
          'line-color': [
            'match',
            ['get', 'status'],

            'impassable',
            COLORS.routeClosed,

            'closed',
            COLORS.routeClosed,

            'blocked',
            COLORS.routeClosed,

            'congested',
            COLORS.routeCongested,

            COLORS.routeOpen,
          ],

          'line-width': [
            'match',
            ['get', 'status'],

            'impassable',
            5,

            'closed',
            5,

            'blocked',
            5,

            'congested',
            4,

            3,
          ],

          'line-opacity': 0.9,
        },
      });
    }

    if (
      !map.getLayer(
        'routes-closed-pattern'
      )
    ) {
      map.addLayer({
        id: 'routes-closed-pattern',
        type: 'line',
        source: 'routes',

        filter: [
          'in',
          ['get', 'status'],
          'impassable',
          'closed',
          'blocked',
        ],

        paint: {
          'line-color':
            '#7f1d1d',

          'line-width': 2,

          'line-dasharray': [
            1.5,
            1.5,
          ],

          'line-opacity': 0.95,
        },
      });
    }

    if (
      !map.getLayer(
        'route-labels'
      )
    ) {
      map.addLayer({
        id: 'route-labels',
        type: 'symbol',
        source: 'routes',

        layout: {
          'text-field': [
            'get',
            'name',
          ],

          'text-size': 9,

          'text-offset': [
            0,
            -1,
          ],

          'symbol-placement':
            'line',
        },

        paint: {
          'text-color':
            '#334155',

          'text-halo-color':
            '#ffffff',

          'text-halo-width': 1,
        },
      });
    }
  };

  const updatePlannedEvacuationLinks =
    async (
      map: any,
      habitations: Habitation[],
      sites: Site[],
      routes: Route[]
    ) => {
      try {
        const activePlan =
          await getActivePlan();

        const plan =
          activePlan?.plan;

        const assignments =
          plan?.assignments ?? [];

        const habitationMap =
          new Map<string, Habitation>();

        habitations.forEach(
          (habitation) => {
            habitationMap.set(
              habitation.id,
              habitation
            );
          }
        );

        const siteMap =
          new Map<string, Site>();

        sites.forEach((site) => {
          siteMap.set(
            site.id,
            site
          );
        });

        const routeMap = new Map<string, Route>();
        routes.forEach((route) => {
          routeMap.set(route.id, route);
        });

        const features =
          assignments
            .map(
              (assignment: any) => {
                const habitation =
                  habitationMap.get(
                    assignment.habitation_id
                  );

                const siteId =
                  assignment.site_id ??
                  assignment.assigned_site_id;

                const site =
                  siteMap.get(siteId);

                const routeId =
                  assignment.route_id ??
                  habitation?.evacuation_route_id;

                const route = routeId ? routeMap.get(routeId) : null;

                if (
                  !habitation?.geometry ||
                  !site?.geometry ||
                  !route?.geometry
                ) {
                  return null;
                }

                return {
                  type: 'Feature' as const,

                  geometry: route.geometry,

                  properties: {
                    habitation_id:
                      assignment.habitation_id,

                    site_id:
                      siteId,

                    route_id: route.id,

                    route_name: route.name,

                    route_status: route.status,

                    households:
                      assignment.households ??
                      assignment.population ??
                      0,

                    distance_km:
                      assignment.distance_km ??
                      route.length_km ??
                      null,
                  },
                };
              }
            )
            .filter(Boolean);

        const data =
          makeFeatureCollection(
            features
          );

        if (
          !map.getSource(
            'planned-evacuation'
          )
        ) {
          map.addSource(
            'planned-evacuation',
            {
              type: 'geojson',
              data,
            }
          );
        } else {
          updateSource(
            map,
            'planned-evacuation',
            data
          );
        }

        if (
          !map.getLayer(
            'planned-evacuation-shadow'
          )
        ) {
          map.addLayer({
            id: 'planned-evacuation-shadow',
            type: 'line',
            source:
              'planned-evacuation',

            paint: {
              'line-color':
                COLORS.evacuationOutline,

              'line-width': 6,
              'line-opacity': 0.9,
            },
          });
        }

        if (
          !map.getLayer(
            'planned-evacuation'
          )
        ) {
          map.addLayer({
            id: 'planned-evacuation',
            type: 'line',
            source:
              'planned-evacuation',

            paint: {
              'line-color':
                COLORS.evacuation,

              'line-width': 3,

              'line-dasharray': [
                4,
                2,
              ],

              'line-opacity': 0.95,
            },
          });
        }
      } catch (error) {
        console.warn(
          'Could not load planned evacuation links:',
          error
        );
      }
    };

  const fitToData = (
    map: any,
    habitations: Habitation[],
    sites: Site[]
  ) => {
    const points: Array<
      [number, number]
    > = [];

    [
      ...habitations,
      ...sites,
    ].forEach((item: any) => {
      const point =
        getFeatureCenter(
          item.geometry
        );

      if (point) {
        points.push(point);
      }
    });

    if (points.length < 2) {
      return;
    }

    const lngs = points.map(
      (point) => point[0]
    );

    const lats = points.map(
      (point) => point[1]
    );

    map.fitBounds(
      [
        [
          Math.min(...lngs),
          Math.min(...lats),
        ],
        [
          Math.max(...lngs),
          Math.max(...lats),
        ],
      ],
      {
        padding: 80,
        duration: 700,
        maxZoom: 12,
      }
    );
  };

  const startPlanPolling = (
    map: any
  ) => {
    if (
      planTimerRef.current
    ) {
      clearInterval(
        planTimerRef.current
      );
    }

    planTimerRef.current =
      setInterval(async () => {
        try {
          const [
            habitationsRes,
            sitesRes,
            routesRes,
          ] = await Promise.all([
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
            habitationsRes.habitations ??
            [],
            sitesRes.sites ?? [],
            routesRes.routes ?? []
          );
        } catch (error) {
          console.warn(
            'Plan refresh failed:',
            error
          );
        }
      }, 5000);
  };

  return (
    <div
      ref={mapContainerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
      }}
      aria-label="Barpeta district disaster management map"
    >
      {/* Emergency warning */}
      {dangerAlert && (
        <div className="absolute left-1/2 top-4 z-50 w-[min(92%,560px)] -translate-x-1/2">
          <div className="rounded-xl border-2 border-red-600 bg-red-600 text-white shadow-2xl p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="text-3xl">
                🚨
              </div>

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
                  🔊 10-BEEP EMERGENCY ALERT · Alternative relocation route required
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDangerAlert(null)
                }
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
                background:
                  RISK_COLORS.RED_ZONE,
              }}
            />
            RED ZONE
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                background:
                  RISK_COLORS.HIGH,
              }}
            />
            HIGH
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                background:
                  RISK_COLORS.MEDIUM,
              }}
            />
            MEDIUM
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                background:
                  RISK_COLORS.LOW,
              }}
            />
            LOW
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                background:
                  COLORS.site,
              }}
            />
            Relocation site
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-6 h-0.5"
              style={{
                background:
                  COLORS.routeOpen,
              }}
            />
            Open road
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-6 h-0.5"
              style={{
                background:
                  COLORS.routeClosed,
              }}
            />
            Blocked road
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-6 border-t-2 border-dashed"
              style={{
                borderColor:
                  COLORS.evacuation,
              }}
            />
            Evacuation route
          </div>
        </div>
      </div>
    </div>
  );
}