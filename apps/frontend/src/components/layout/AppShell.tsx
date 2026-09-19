"use client";

import { ReactNode, useState, useEffect } from "react";
import { TopMenuBar } from "@/components/ui/TopMenuBar";
import { PersistentLiveMap } from "@/components/map/PersistentLiveMap";
import { EmergencyStatusBanner } from "@/components/ui/EmergencyStatusBanner";
import { ContentOverlay, SlideOverDrawer } from "@/components/ui/ContentOverlay";
import { useView, ViewName, VIEW_CONFIG } from "@/context/ViewContext";
import { useMapState } from "@/context/MapStateContext";
import { Minimize2, ChevronUp, ChevronDown, Route } from "lucide-react";
import { getRouteCandidates } from "@/lib/api";
import type { RouteCandidate } from "@/lib/api";

const PANEL_VIEWS: ViewName[] = ["overview", "risk-intelligence", "disaster-simulation", "map-intelligence"];
const DRAWER_VIEWS: ViewName[] = ["vulnerable-habitations", "relocation-sites", "plan-approvals", "audit-activity", "relocation-planning", "alerts-telecom", "about-scope"];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { currentView, setCurrentView } = useView();
  const { layerVisibility, setLayerVisibility, selection } = useMapState();
  const [emergencyDismissed, setEmergencyDismissed] = useState(false);
  const [activePanel, setActivePanel] = useState<ViewName | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<ViewName | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [selectedHabitationForRoutes, setSelectedHabitationForRoutes] = useState<string | null>(null);

  const isPanelView = PANEL_VIEWS.includes(currentView);
  const isDrawerView = DRAWER_VIEWS.includes(currentView);

  const handleViewChange = (view: string) => {
    setCurrentView(view as ViewName);
    if (DRAWER_VIEWS.includes(view as ViewName)) {
      setActiveDrawer(view as ViewName);
      setActivePanel(null);
    } else if (PANEL_VIEWS.includes(view as ViewName)) {
      setActivePanel(view as ViewName);
      setActiveDrawer(null);
    } else {
      setActivePanel(null);
      setActiveDrawer(null);
    }
  };

  useEffect(() => {
    if (PANEL_VIEWS.includes(currentView)) {
      setActivePanel(currentView);
      setActiveDrawer(null);
    } else if (DRAWER_VIEWS.includes(currentView)) {
      setActiveDrawer(currentView);
      setActivePanel(null);
    } else {
      setActivePanel(null);
      setActiveDrawer(null);
    }
  }, [currentView]);

  // Task 3a: Open bottom panel when a habitation is selected on the map
  useEffect(() => {
    if (selection.selectedHabitationId) {
      setSelectedHabitationForRoutes(selection.selectedHabitationId);
      setIsBottomPanelOpen(true);
    }
  }, [selection.selectedHabitationId]);

  return (
    <div className="relative min-h-screen w-full bg-slate-50">
      {/* Full-screen map as absolute base layer */}
      <div className="absolute inset-0 z-0">
        <PersistentLiveMap />
      </div>

      {/* Top menu bar */}
      <div className="relative z-20">
        <TopMenuBar
          currentView={currentView}
          onViewChange={handleViewChange}
          layerVisibility={layerVisibility as unknown as Record<string, boolean>}
          onLayerToggle={(layer: string) => setLayerVisibility({ [layer]: !(layerVisibility as unknown as Record<string, boolean>)[layer] })}
          isMapFullscreen={isMapFullscreen}
          onToggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)}
        />
      </div>

      {/* Emergency banner */}
      {!emergencyDismissed && (
        <div className="fixed top-[56px] left-0 right-0 z-30">
          <EmergencyStatusBanner />
        </div>
      )}

      {/* Right-side panels/drawers */}
      {activePanel && (
        <ContentOverlay
          isOpen={true}
          onClose={() => { setActivePanel(null); setCurrentView("overview"); }}
          title={VIEW_CONFIG[activePanel]?.label || "Panel"}
          description={VIEW_CONFIG[activePanel]?.description}
          position="top-right"
          size="lg"
          showMaximize
          onMaximize={() => setActiveDrawer(activePanel)}
        >
          {children}
        </ContentOverlay>
      )}

      {activeDrawer && (
        <SlideOverDrawer
          isOpen={true}
          onClose={() => { setActiveDrawer(null); setCurrentView("overview"); }}
          title={VIEW_CONFIG[activeDrawer]?.label || "Drawer"}
          description={VIEW_CONFIG[activeDrawer]?.description}
          side="right"
          size={currentView === "disaster-simulation" ? "full" : "xl"}
        >
          {children}
        </SlideOverDrawer>
      )}

      {/* Bottom-anchored route picker panel */}
      <BottomRoutePickerPanel
        isOpen={isBottomPanelOpen}
        onClose={() => setIsBottomPanelOpen(false)}
        habitationId={selectedHabitationForRoutes}
        onHabitationSelect={(habId) => {
          setSelectedHabitationForRoutes(habId);
          setIsBottomPanelOpen(true);
        }}
      />

      {isMapFullscreen && (
        <button
          onClick={() => setIsMapFullscreen(false)}
          className="fixed bottom-4 right-4 z-50 p-2 rounded-full bg-white border border-slate-200 shadow-lg hover:bg-slate-50"
          aria-label="Exit fullscreen"
        >
          <Minimize2 className="w-5 h-5 text-slate-600" />
        </button>
      )}
    </div>
  );
}

function BottomRoutePickerPanel({ isOpen, onClose, habitationId, onHabitationSelect }: { 
  isOpen: boolean; 
  onClose: () => void; 
  habitationId: string | null;
  onHabitationSelect: (habId: string) => void;
}) {
  const [routeCandidates, setRouteCandidates] = useState<RouteCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RouteCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { selection, setSelection, mapInstance } = useMapState();

  useEffect(() => {
    if (!habitationId) {
      setRouteCandidates([]);
      setSelectedCandidate(null);
      return;
    }
    
    setIsLoading(true);
    getRouteCandidates(habitationId)
      .then((data) => {
        setRouteCandidates(data.candidates);
        if (data.candidates.length > 0) {
          setSelectedCandidate(data.candidates[0]);
        }
      })
      .catch((e) => console.error("Failed to load route candidates:", e))
      .finally(() => setIsLoading(false));
  }, [habitationId]);

  const handleCandidateSelect = (candidate: RouteCandidate) => {
    setSelectedCandidate(candidate);
    // Task 3c: Update selectedRouteId in MapStateContext and fit map to route geometry
    setSelection({ selectedRouteId: candidate.route_id });
    if (mapInstance && candidate.geometry) {
      const coords = candidate.geometry.coordinates;
      if (coords.length >= 2) {
        const lngs = coords.map((c: [number, number]) => c[0]);
        const lats = coords.map((c: [number, number]) => c[1]);
        mapInstance.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 100, duration: 700 },
        );
      }
    }
  };

  // Task 3b: Always render the persistent tab handle
  const renderTabHandle = () => (
    <button
      onClick={() => {
        if (isOpen) {
          onClose();
        } else if (habitationId) {
          onHabitationSelect(habitationId);
        }
      }}
      className="w-full flex items-center justify-center py-2"
      aria-label={isOpen ? "Close route picker" : "Open route picker"}
    >
      <div className="w-10 h-1.5 bg-slate-300 rounded-full relative">
        <div className="absolute inset-0 bg-slate-300 rounded-full animate-pulse" />
      </div>
    </button>
  );

  if (!isOpen && !habitationId) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-4xl pointer-events-auto">
          <div className="bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl">
            {renderTabHandle()}
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-4xl pointer-events-auto">
          <div className="bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl">
            {renderTabHandle()}
            <div className="p-4 max-h-[60vh] overflow-auto hidden">
              <div className="text-center py-8 text-slate-400">
                <p>Select a habitation on the map to see evacuation routes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-4xl pointer-events-auto">
        <div className="bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl">
          {/* Tab handle - always visible */}
          {renderTabHandle()}
          
          <div className="p-4 max-h-[60vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Route className="w-5 h-5 text-blue-600" />
                Evacuation Routes
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-blue-800">
                  <svg className="animate-spin w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" />
                  </svg>
                  <span className="font-medium text-sm">Loading routes...</span>
                </div>
              ) : routeCandidates.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-900 mb-2">{routeCandidates.length} evacuation routes available</p>
                  <div className="space-y-1 max-h-[50vh] overflow-auto">
                    {routeCandidates.map((c) => (
                      <button
                        key={c.route_id}
                        onClick={() => handleCandidateSelect(c)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          c.route_id === selectedCandidate?.route_id 
                            ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200" 
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{c.route_name}</span>
                          {c.is_recommended && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Recommended</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>→ {c.site_name}</span>
                          <span className="text-[10px]">•</span>
                          <span>{c.distance_km} km</span>
                          <span className="text-[10px]">•</span>
                          <span>{c.travel_time_min} min</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.status === "open" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m-4 0h.01M17 19v-6a2 2 0 00-2-2h-2a2 2 0 002 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m-4 0h.01" />
                  </svg>
                  <p>No evacuation routes found for this habitation</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}