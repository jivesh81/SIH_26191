'use client';

import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Header } from '@/components/ui/Header';
import { LegendPanel } from '@/components/panels/LegendPanel';
import { LayerControl } from '@/components/panels/LayerControl';
import { StatusBar } from '@/components/ui/StatusBar';
import { default as nextDynamic } from 'next/dynamic';

const MapContainer = nextDynamic(
  () => import('@/components/map/MapContainer').then(mod => ({ default: mod.MapContainer })),
  { ssr: false }
);

export default function HomePage() {
  const [mapLoaded, setMapLoaded] = useState(false);

  return (
    <div className="h-screen w-full flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar>
          <div className="space-y-4 p-4 overflow-y-auto h-full">
            <LayerControl />
            <LegendPanel />
          </div>
        </Sidebar>
        <main className="flex-1 relative min-w-0">
          <MapContainer onLoad={() => setMapLoaded(true)} />
        </main>
        <Sidebar position="right" defaultOpen={false}>
          <div className="p-4 overflow-y-auto h-full">
            <div className="text-sm text-slate-500">Detail panel - click a feature</div>
          </div>
        </Sidebar>
      </div>
      <StatusBar mapLoaded={mapLoaded} />
    </div>
  );
}

