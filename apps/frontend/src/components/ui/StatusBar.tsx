'use client';

interface StatusBarProps {
  mapLoaded: boolean;
}

export function StatusBar({ mapLoaded }: StatusBarProps) {
  return (
    <footer className="h-8 bg-white border-t border-slate-200 flex items-center justify-between px-4 text-xs text-slate-500">
      <div className="flex items-center gap-3">
        <span className={`flex items-center gap-1.5 ${mapLoaded ? 'text-green-600' : 'text-amber-600'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${mapLoaded ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
          {mapLoaded ? 'Map Ready' : 'Loading Map...'}
        </span>
        <span className="text-green-600 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          API Connected
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>EPSG:3857</span>
        <span id="coordinates">Lat: —, Lng: —</span>
        <span>Zoom: —</span>
      </div>
    </footer>
  );
}