'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MapContainer } from '@/components/map/MapContainer';
import { useMapState, MapViewport, MapLayerVisibility } from '@/context/MapStateContext';

export function PersistentLiveMap() {
  const { viewport, selection, layerVisibility, setMapInstance, setViewport, setSelection, setLayerVisibility } = useMapState();
  const mapRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const viewportSyncRef = useRef(false);

  const handleMapLoad = useCallback((map: any) => {
    mapRef.current = map;
    setMapInstance(map);

    if (!isInitializedRef.current) {
      map.on('moveend', () => {
        if (viewportSyncRef.current) return;
        const center = map.getCenter();
        const zoom = map.getZoom();
        const bearing = map.getBearing();
        const pitch = map.getPitch();
        setViewport({ center: [center.lng, center.lat], zoom, bearing, pitch });
      });
      isInitializedRef.current = true;
    }

    map.on('click', ['habitations'], (e: any) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id) {
        setSelection({ selectedHabitationId: feature.properties.id });
      }
    });

    map.on('click', ['sites-point'], (e: any) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id) {
        setSelection({ selectedSiteId: feature.properties.id });
      }
    });

    map.on('click', ['routes-base'], (e: any) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id) {
        setSelection({ selectedRouteId: feature.properties.id });
      }
    });
  }, [setMapInstance, setViewport, setSelection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    viewportSyncRef.current = true;
    map.jumpTo({
      center: viewport.center,
      zoom: viewport.zoom,
      bearing: viewport.bearing,
      pitch: viewport.pitch,
    });
    viewportSyncRef.current = false;
  }, [viewport]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layers = [
      { id: 'habitations', visible: layerVisibility.habitations },
      { id: 'habitation-labels', visible: layerVisibility.habitations },
      { id: 'sites-polygon', visible: layerVisibility.sites },
      { id: 'sites-point', visible: layerVisibility.sites },
      { id: 'site-labels', visible: layerVisibility.sites },
      { id: 'routes-base', visible: layerVisibility.routes },
      { id: 'routes-closed-pattern', visible: layerVisibility.routes },
      { id: 'route-labels', visible: layerVisibility.routes },
      { id: 'planned-evacuation', visible: layerVisibility.plannedEvacuation },
      { id: 'planned-evacuation-shadow', visible: layerVisibility.plannedEvacuation },
      { id: 'hazard-flood', visible: layerVisibility.hazardZones },
      { id: 'hazard-erosion', visible: layerVisibility.hazardZones },
      { id: 'hazard-storm-surge', visible: layerVisibility.hazardZones },
    ];

    layers.forEach(({ id, visible }) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      }
    });
  }, [layerVisibility]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selection.selectedHabitationId) {
      const source = map.getSource('habitations');
      if (source) {
        const data = source.serialize();
        if (data && Array.isArray(data.features)) {
          const feature = data.features.find((f: any) => f.properties.id === selection.selectedHabitationId);
          if (feature) {
            const coords = feature.geometry.coordinates;
            map.flyTo({ center: coords, zoom: 12, duration: 500 });
          }
        }
      }
    }
  }, [selection.selectedHabitationId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selection.selectedSiteId) {
      const source = map.getSource('sites');
      if (source) {
        const data = source.serialize();
        if (data && Array.isArray(data.features)) {
          const feature = data.features.find((f: any) => f.properties.id === selection.selectedSiteId);
          if (feature) {
            const center = feature.geometry.type === 'Point'
              ? feature.geometry.coordinates
              : [0, 0];
            if (center[0] !== 0 || center[1] !== 0) {
              map.flyTo({ center, zoom: 12, duration: 500 });
            }
          }
        }
      }
    }
  }, [selection.selectedSiteId]);

  return (
    <div className="h-full w-full min-w-0">
      <MapContainer onLoad={handleMapLoad} />
    </div>
  );
}

export function PersistentLiveMapPanel() {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
        <h2 className="text-sm font-semibold text-slate-900">Live Map</h2>
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
          </span>
          LIVE
        </span>
      </div>
      <div className="flex-1 min-h-0 relative">
        <PersistentLiveMap />
      </div>
    </div>
  );
}