'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type ViewName =
  | 'overview'
  | 'risk-intelligence'
  | 'relocation-planning'
  | 'disaster-simulation'
  | 'map-intelligence'
  | 'alerts-telecom'
  | 'plan-approvals'
  | 'vulnerable-habitations'
  | 'relocation-sites'
  | 'audit-activity'
  | 'about-scope';

interface ViewContextType {
  currentView: ViewName;
  setCurrentView: (view: ViewName) => void;
}

const ViewContext = createContext<ViewContextType | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewName>('overview');

  return (
    <ViewContext.Provider value={{ currentView, setCurrentView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}

export const VIEW_CONFIG: Record<ViewName, { label: string; icon: string; description: string }> = {
  overview: {
    label: 'Command Center',
    icon: '📊',
    description: 'Operational overview & KPIs',
  },
  'risk-intelligence': {
    label: 'Risk Intelligence',
    icon: '⚠️',
    description: 'Hazard & vulnerability analysis',
  },
  'relocation-planning': {
    label: 'Relocation Planning',
    icon: '🏕️',
    description: 'Capacity & site assignment',
  },
  'disaster-simulation': {
    label: 'Disaster Simulation',
    icon: '🌊',
    description: 'Event simulation & re-optimization',
  },
  'map-intelligence': {
    label: 'Map Intelligence',
    icon: '🗺️',
    description: 'GIS layers & evacuation routes',
  },
  'alerts-telecom': {
    label: 'Alerts & Telecom',
    icon: '📡',
    description: 'SMS dispatch & approval status',
  },
  'plan-approvals': {
    label: 'Plan Approvals',
    icon: '✅',
    description: 'Authority approval workflow',
  },
  'vulnerable-habitations': {
    label: 'Vulnerable Habitations',
    icon: '🏘️',
    description: 'Prioritized habitation list',
  },
  'relocation-sites': {
    label: 'Relocation Sites',
    icon: '🏕️',
    description: 'Safe site details & capacity',
  },
  'audit-activity': {
    label: 'Audit & Activity',
    icon: '📋',
    description: 'Event log & system activity',
  },
  'about-scope': {
    label: 'About / Scope',
    icon: 'ℹ️',
    description: 'Project scope & methodology',
  },
};