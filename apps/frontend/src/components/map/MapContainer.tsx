'use client';

import { useEffect, useRef, useState } from 'react';

interface MapContainerProps {
  onLoad?: (map: any) => void;
}

const BARPETA_BOUNDS: [number, number, number, number] = [90.5, 26.0, 91.5, 27.0];
const BARPETA_CENTER: [number, number] = [91.0, 26.5];

export function MapContainer({ onLoad }: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    // Dynamically import maplibre-gl only on client side
    import('maplibre-gl').then(maplibregl => {
      // CSS is imported globally in layout.tsx
      const map = new maplibregl.default.Map({
        container: mapContainerRef.current!,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
              maxzoom: 19,
            },
            'cartodb-light': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
              ],
              tileSize: 256,
              attribution: '© CARTO © OpenStreetMap contributors',
              maxzoom: 19,
            },
          },
          layers: [
            {
              id: 'base-map',
              type: 'raster',
              source: 'cartodb-light',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: BARPETA_CENTER,
        zoom: 10,
        bounds: BARPETA_BOUNDS,
        attributionControl: false,
      });

      map.addControl(new maplibregl.default.AttributionControl({ compact: true }), 'bottom-right');
      map.addControl(new maplibregl.default.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new maplibregl.default.ScaleControl({ unit: 'metric' }), 'bottom-left');

      map.on('load', () => {
        setMapLoaded(true);
        onLoad?.(map);
      });

      map.on('move', () => {
        const center = map.getCenter();
        setCoordinates([center.lng, center.lat]);
        setZoom(Math.round(map.getZoom() * 100) / 100);
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
        setMapLoaded(false);
      };
    });

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapLoaded(false);
      }
    };
  }, [onLoad]);

  useEffect(() => {
    const coordEl = document.getElementById('coordinates');
    const zoomEl = document.querySelector('footer span:last-child');
    if (coordEl && coordinates) {
      coordEl.textContent = `Lat: ${coordinates[1].toFixed(4)}, Lng: ${coordinates[0].toFixed(4)}`;
    }
    if (zoomEl) {
      zoomEl.textContent = `Zoom: ${zoom}`;
    }
  }, [coordinates, zoom]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
      aria-label="Barpeta district map"
    />
  );
}