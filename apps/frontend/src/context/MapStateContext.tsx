'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface MapViewport {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface MapSelection {
  selectedHabitationId: string | null;
  selectedSiteId: string | null;
  selectedRouteId: string | null;
  activeEventId: string | null;
}

export interface MapLayerVisibility {
  habitations: boolean;
  sites: boolean;
  routes: boolean;
  evacuation: boolean;
  hazardZones: boolean;
  plannedEvacuation: boolean;
}

interface MapStateContextType {
  viewport: MapViewport;
  setViewport: (viewport: Partial<MapViewport>) => void;
  selection: MapSelection;
  setSelection: (selection: Partial<MapSelection>) => void;
  layerVisibility: MapLayerVisibility;
  setLayerVisibility: (layers: Partial<MapLayerVisibility>) => void;
  mapInstance: any | null;
  setMapInstance: (map: any) => void;
  resetMap: () => void;
}

const DEFAULT_VIEWPORT: MapViewport = {
  center: [91.0, 26.5],
  zoom: 9.5,
  bearing: 0,
  pitch: 0,
};

const DEFAULT_SELECTION: MapSelection = {
  selectedHabitationId: null,
  selectedSiteId: null,
  selectedRouteId: null,
  activeEventId: null,
};

const DEFAULT_LAYER_VISIBILITY: MapLayerVisibility = {
  habitations: true,
  sites: true,
  routes: true,
  evacuation: true,
  hazardZones: true,
  plannedEvacuation: true,
};

const MapStateContext = createContext<MapStateContextType | null>(null);

export function MapStateProvider({ children }: { children: ReactNode }) {
  const [viewport, setViewportState] = useState<MapViewport>(DEFAULT_VIEWPORT);
  const [selection, setSelectionState] = useState<MapSelection>(DEFAULT_SELECTION);
  const [layerVisibility, setLayerVisibilityState] = useState<MapLayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [mapInstance, setMapInstance] = useState<any | null>(null);

  const setViewport = useCallback((updates: Partial<MapViewport>) => {
    setViewportState(prev => ({ ...prev, ...updates }));
  }, []);

  const setSelection = useCallback((updates: Partial<MapSelection>) => {
    setSelectionState(prev => ({ ...prev, ...updates }));
  }, []);

  const setLayerVisibility = useCallback((updates: Partial<MapLayerVisibility>) => {
    setLayerVisibilityState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetMap = useCallback(() => {
    setViewportState(DEFAULT_VIEWPORT);
    setSelectionState(DEFAULT_SELECTION);
    setLayerVisibilityState(DEFAULT_LAYER_VISIBILITY);
  }, []);

  const value: MapStateContextType = {
    viewport,
    setViewport,
    selection,
    setSelection,
    layerVisibility,
    setLayerVisibility,
    mapInstance,
    setMapInstance,
    resetMap,
  };

  return (
    <MapStateContext.Provider value={value}>
      {children}
    </MapStateContext.Provider>
  );
}

export function useMapState() {
  const context = useContext(MapStateContext);
  if (!context) {
    throw new Error('useMapState must be used within a MapStateProvider');
  }
  return context;
}