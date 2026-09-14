'use client';

interface StatusBarProps {
  mapLoaded: boolean;
}

export function StatusBar({ mapLoaded }: StatusBarProps) {
  return (
    <footer className="h-12 bg-navy-900/80 backdrop-blur-xl border-t border-navy-700/50 flex items-center justify-between px-6 text-caption text-navy-400">
      <div className="flex items-center gap-4">
        <span className={`flex items-center gap-2 ${mapLoaded ? 'text-green-400' : 'text-amber-400'}`}>
          <span className={`w-2 h-2 rounded-full ${mapLoaded ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
          {mapLoaded ? 'Map Ready' : 'Loading Map...'}
        </span>
        <span className="flex items-center gap-2 text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          API Connected
        </span>
      </div>
      <div className="flex items-center gap-6">
        <span className="font-mono text-navy-300">EPSG:3857</span>
        <span id="coordinates" className="font-mono text-navy-300">Lat: —, Lng: —</span>
        <span className="font-mono text-navy-300">Zoom: —</span>
      </div>
    </footer>
  );
}