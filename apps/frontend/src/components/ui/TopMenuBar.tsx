"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TriangleAlert,
  Route,
  Users,
  Building2,
  Map,
  CloudRain,
  Bell,
  ClipboardCheck,
  History,
  Info,
  LayoutDashboard,
  ChevronDown,
  X,
  Maximize2,
  Minimize2,
  MapPin,
  Layers,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";

interface TopMenuBarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  layerVisibility: Record<string, boolean>;
  onLayerToggle: (layer: string) => void;
  isMapFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const MENU_GROUPS = {
  intelligence: {
    label: "Intelligence",
    icon: TriangleAlert,
    items: [
      { key: "risk-intelligence", label: "Risk Intelligence", description: "Hazard & vulnerability analysis", href: "/command-center/risk-intelligence", icon: TriangleAlert },
      { key: "vulnerable-habitations", label: "Vulnerable Habitations", description: "Prioritized habitation list", href: "/command-center/vulnerable-habitations", icon: Users },
    ],
  },
  planning: {
    label: "Planning",
    icon: Route,
    items: [
      { key: "relocation-planning", label: "Relocation Planning", description: "Capacity & site assignment", href: "/command-center/relocation-planning", icon: Route },
      { key: "relocation-sites", label: "Relocation Sites", description: "Safe site details & capacity", href: "/command-center/relocation-sites", icon: Building2 },
      { key: "map-intelligence", label: "Map Intelligence", description: "GIS layers & evacuation routes", href: "/command-center/map-intelligence", icon: Map },
    ],
  },
  response: {
    label: "Response",
    icon: CloudRain,
    items: [
      { key: "disaster-simulation", label: "Disaster Simulation", description: "Event simulation & re-optimization", href: "/command-center/disaster-simulation", icon: CloudRain },
      { key: "alerts-telecom", label: "Alerts & Telecom", description: "SMS dispatch & approval status", href: "/command-center/alerts-telecom", icon: Bell },
      { key: "plan-approvals", label: "Plan Approvals", description: "Authority approval workflow", href: "/command-center/plan-approvals", icon: ClipboardCheck },
    ],
  },
};

export function TopMenuBar({
  currentView,
  onViewChange,
  layerVisibility,
  onLayerToggle,
  isMapFullscreen,
  onToggleFullscreen,
}: TopMenuBarProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown-menu]')) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getActiveGroup = (): string | null => {
    for (const [groupKey, group] of Object.entries(MENU_GROUPS)) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(item.href + "/")) {
          return groupKey;
        }
      }
    }
    return null;
  };

  const activeGroup = getActiveGroup();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 h-[56px]">
      <div className="max-w-full h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href="/command-center" className="flex items-center gap-2.5 flex-shrink-0" aria-label="Aapda Setu Home">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v2m0 0H9m3 0h3" />
              </svg>
            </div>
            <div className="hidden sm:block min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">Aapda Setu</h1>
              <p className="text-xs text-slate-500 truncate">Disaster Intelligence Platform</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
            <Badge variant="info" size="sm" className="whitespace-nowrap">
              Barpeta, Assam
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0" data-dropdown-menu>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" /></span>
            <span className="text-sm font-medium text-slate-700">System Operational</span>
          </div>

          {Object.entries(MENU_GROUPS).map(([groupKey, group]) => {
            const IconComponent = group.icon;
            const isActive = activeGroup === groupKey;
            const isOpen = openMenu === groupKey;

            return (
              <div key={groupKey} className="relative" ref={(el) => { dropdownRefs.current[groupKey] = el; }}>
                <div className="relative">
                  <button
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : isOpen
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    onClick={() => setOpenMenu(isOpen ? null : groupKey)}
                    onMouseEnter={() => !isOpen && setOpenMenu(groupKey)}
                    onMouseLeave={() => !isOpen && setOpenMenu(null)}
                  >
                    <IconComponent className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                    <span className="hidden sm:inline">{group.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div
                      className="absolute right-0 top-full z-50 mt-1 w-72 p-2 bg-white border border-slate-200 rounded-lg shadow-lg"
                      onMouseEnter={() => setOpenMenu(groupKey)}
                      onMouseLeave={() => setOpenMenu(null)}
                    >
                      <div className="px-2 py-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.label}</p>
                      </div>
                      <div className="border-t border-slate-200 my-1" />
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isCurrentItem = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                          <Link
                            key={item.key}
                            href={item.href}
                            onClick={() => { setOpenMenu(null); onViewChange(item.key); }}
                            className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                              isCurrentItem ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <ItemIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isCurrentItem ? "text-blue-600" : "text-slate-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.label}</p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                            </div>
                            {isCurrentItem && <Badge variant="info" size="sm">ACTIVE</Badge>}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="hidden lg:flex items-center gap-2 ml-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => onLayerToggle("habitations")} className={`p-2 rounded-lg transition-colors ${layerVisibility.habitations ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-100"}`} aria-label="Toggle habitations layer" title="Habitations">
                <Users className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onLayerToggle("sites")} className={`p-2 rounded-lg transition-colors ${layerVisibility.sites ? "bg-green-50 text-green-600" : "text-slate-500 hover:bg-slate-100"}`} aria-label="Toggle sites layer" title="Sites">
                <Building2 className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onLayerToggle("routes")} className={`p-2 rounded-lg transition-colors ${layerVisibility.routes ? "bg-amber-50 text-amber-600" : "text-slate-500 hover:bg-slate-100"}`} aria-label="Toggle routes layer" title="Routes">
                <Route className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onLayerToggle("evacuation")} className={`p-2 rounded-lg transition-colors ${layerVisibility.evacuation ? "bg-cyan-50 text-cyan-600" : "text-slate-500 hover:bg-slate-100"}`} aria-label="Toggle evacuation layer" title="Evacuation">
                <MapPin className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onLayerToggle("hazardZones")} className={`p-2 rounded-lg transition-colors ${layerVisibility.hazardZones ? "bg-red-50 text-red-600" : "text-slate-500 hover:bg-slate-100"}`} aria-label="Toggle hazard zones" title="Hazards">
                <TriangleAlert className="w-5 h-5" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
              aria-label={isMapFullscreen ? "Exit fullscreen" : "Fullscreen map"}
              title={isMapFullscreen ? "Exit fullscreen" : "Fullscreen map"}
            >
              {isMapFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>

            <Link href="/command-center">
              <Button variant="primary" size="sm" className="hidden sm:inline-flex items-center gap-2 ml-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Enter Command Center
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}