'use client';

import { useState } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  children?: Layer[];
  metadata?: {
    type: 'vector' | 'raster' | 'heatmap';
    source: string;
  };
}

const LAYERS: Layer[] = [
  {
    id: 'admin-boundaries',
    name: 'Administrative Boundaries',
    visible: true,
    metadata: { type: 'vector', source: 'barpeta-admin' },
    children: [
      { id: 'district', name: 'District Boundary', visible: true },
      { id: 'blocks', name: 'Block Boundaries', visible: true },
      { id: 'villages', name: 'Village Boundaries', visible: false },
    ],
  },
  {
    id: 'hazard-zones',
    name: 'Hazard Zones',
    visible: true,
    metadata: { type: 'vector', source: 'hazard-zones' },
    children: [
      { id: 'flood-zones', name: 'Flood Prone Areas', visible: true },
      { id: 'erosion-zones', name: 'River Erosion Zones', visible: false },
      { id: 'storm-surge', name: 'Storm Surge Zones', visible: false },
    ],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    visible: true,
    metadata: { type: 'vector', source: 'infrastructure' },
    children: [
      { id: 'roads', name: 'Road Network', visible: true },
      { id: 'bridges', name: 'Bridges', visible: true },
      { id: 'culverts', name: 'Culverts', visible: false },
    ],
  },
  {
    id: 'shelters',
    name: 'Shelters & Facilities',
    visible: true,
    metadata: { type: 'vector', source: 'shelters' },
    children: [
      { id: 'relief-camps', name: 'Relief Camps', visible: true },
      { id: 'schools', name: 'Schools (Potential Shelters)', visible: false },
      { id: 'hospitals', name: 'Health Facilities', visible: true },
      { id: 'community-centers', name: 'Community Centers', visible: false },
    ],
  },
  {
    id: 'population',
    name: 'Population & Vulnerability',
    visible: false,
    metadata: { type: 'heatmap', source: 'population-grid' },
    children: [
      { id: 'population-density', name: 'Population Density', visible: false },
      { id: 'vulnerability-index', name: 'Vulnerability Index', visible: false },
      { id: 'habitations', name: 'Vulnerable Habitations', visible: false },
    ],
  },
  {
    id: 'optimization',
    name: 'Optimization Results',
    visible: false,
    metadata: { type: 'vector', source: 'optimization' },
    children: [
      { id: 'relocation-sites', name: 'Recommended Relocation Sites', visible: false },
      { id: 'routes', name: 'Evacuation Routes', visible: false },
      { id: 'capacity', name: 'Effective Capacity', visible: false },
    ],
  },
];

export function LayerControl() {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'admin-boundaries': true,
    'hazard-zones': true,
    'infrastructure': true,
    'shelters': true,
    'population': false,
    'optimization': false,
  });
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>(
    LAYERS.reduce((acc, group) => {
      acc[group.id] = group.visible;
      group.children?.forEach(child => { acc[child.id] = child.visible; });
      return acc;
    }, {} as Record<string, boolean>)
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleLayer = (layerId: string) => {
    setLayerVisibility(prev => ({ ...prev, [layerId]: !prev[layerId] }));
    // TODO: Connect to map layer visibility
  };

  const toggleGroupLayers = (group: Layer, visible: boolean) => {
    const updates: Record<string, boolean> = { [group.id]: visible };
    group.children?.forEach(child => { updates[child.id] = visible; });
    setLayerVisibility(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
        Map Layers
      </h3>

      <div className="space-y-1" role="tree" aria-label="Map layers">
        {LAYERS.map((group) => (
          <LayerGroup
            key={group.id}
            group={group}
            isExpanded={expandedGroups[group.id]}
            groupVisible={layerVisibility[group.id]}
            onToggleGroup={toggleGroup}
            onToggleLayer={toggleLayer}
            onToggleGroupLayers={toggleGroupLayers}
            layerVisibility={layerVisibility}
          />
        ))}
      </div>

      <div className="pt-2 border-t border-slate-200">
        <button
          className="w-full text-left px-2 py-1.5 text-xs text-aapda-600 hover:text-aapda-700 font-medium flex items-center gap-2"
          onClick={() => {
            // TODO: Trigger optimization
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Run Relocation Optimization
        </button>
      </div>
    </div>
  );
}

interface LayerGroupProps {
  group: Layer;
  isExpanded: boolean;
  groupVisible: boolean;
  onToggleGroup: (id: string) => void;
  onToggleLayer: (id: string) => void;
  onToggleGroupLayers: (group: Layer, visible: boolean) => void;
  layerVisibility: Record<string, boolean>;
}

function LayerGroup({ group, isExpanded, groupVisible, onToggleGroup, onToggleLayer, onToggleGroupLayers, layerVisibility }: LayerGroupProps) {
  const allChildrenVisible = group.children?.every(c => layerVisibility[c.id]) ?? false;
  const someChildrenVisible = group.children?.some(c => layerVisibility[c.id]) ?? false;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => onToggleGroup(group.id)}
        className="w-full flex items-center justify-between p-2 hover:bg-slate-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={groupVisible}
            onChange={(e) => onToggleGroupLayers(group, e.target.checked)}
            className="w-4 h-4 text-aapda-600 border-slate-300 rounded focus:ring-aapda-500"
            aria-label={group.name}
          />
          <span className="text-sm font-medium text-slate-900">{group.name}</span>
          {someChildrenVisible && !allChildrenVisible && (
            <span className="w-1.5 h-1.5 bg-slate-400 rounded" aria-hidden="true" />
          )}
        </label>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && group.children && (
        <div className="pl-8 border-t border-slate-100 space-y-1 pb-2" role="group" aria-label={`${group.name} layers`}>
          {group.children.map((child) => (
            <label key={child.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={layerVisibility[child.id]}
                onChange={(e) => onToggleLayer(child.id)}
                className="w-4 h-4 text-aapda-600 border-slate-300 rounded focus:ring-aapda-500"
                aria-label={child.name}
              />
              <span className="text-sm text-slate-700">{child.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}