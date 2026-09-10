'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface LegendItem {
  label: string;
  color: string;
  type: 'fill' | 'line' | 'circle' | 'pattern';
  pattern?: string;
}

interface LegendGroup {
  id: string;
  title: string;
  items: LegendItem[];
  expanded?: boolean;
}

const LEGEND_GROUPS: LegendGroup[] = [
  {
    id: 'hazard',
    title: 'Hazard Zones',
    expanded: true,
    items: [
      { label: 'High Flood Risk', color: '#dc2626', type: 'fill' },
      { label: 'Medium Flood Risk', color: '#f97316', type: 'fill' },
      { label: 'Low Flood Risk', color: '#fbbf24', type: 'fill' },
      { label: 'River Erosion Zone', color: '#7f1d1d', type: 'pattern', pattern: 'diagonal-lines' },
      { label: 'Storm Surge Zone', color: '#0c4a6e', type: 'pattern', pattern: 'dots' },
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    expanded: true,
    items: [
      { label: 'National Highway', color: '#1e293b', type: 'line' },
      { label: 'State Highway', color: '#334155', type: 'line' },
      { label: 'District Road', color: '#64748b', type: 'line' },
      { label: 'Rural Road', color: '#94a3b8', type: 'line' },
      { label: 'Bridge (Operational)', color: '#16a34a', type: 'circle' },
      { label: 'Bridge (Damaged)', color: '#dc2626', type: 'circle' },
      { label: 'Bridge (Collapsed)', color: '#7f1d1d', type: 'circle' },
    ],
  },
  {
    id: 'shelters',
    title: 'Shelters & Facilities',
    expanded: true,
    items: [
      { label: 'Relief Camp (Active)', color: '#16a34a', type: 'circle' },
      { label: 'Relief Camp (Full)', color: '#dc2626', type: 'circle' },
      { label: 'School (Potential Shelter)', color: '#2563eb', type: 'circle' },
      { label: 'Hospital / Health Center', color: '#db2777', type: 'circle' },
      { label: 'Community Center', color: '#7c3aed', type: 'circle' },
    ],
  },
  {
    id: 'population',
    title: 'Population & Vulnerability',
    expanded: false,
    items: [
      { label: 'Very High Vulnerability', color: '#7f1d1d', type: 'fill' },
      { label: 'High Vulnerability', color: '#dc2626', type: 'fill' },
      { label: 'Medium Vulnerability', color: '#f97316', type: 'fill' },
      { label: 'Low Vulnerability', color: '#22c55e', type: 'fill' },
      { label: 'Vulnerable Habitation', color: '#dc2626', type: 'circle' },
    ],
  },
  {
    id: 'optimization',
    title: 'Optimization Results',
    expanded: false,
    items: [
      { label: 'Recommended Relocation Site', color: '#059669', type: 'fill' },
      { label: 'Evacuation Route (Primary)', color: '#16a34a', type: 'line' },
      { label: 'Evacuation Route (Alternative)', color: '#65a30d', type: 'line' },
      { label: 'Route Impassable', color: '#dc2626', type: 'line' },
      { label: 'Effective Capacity > 80%', color: '#dc2626', type: 'fill' },
      { label: 'Effective Capacity 50-80%', color: '#f97316', type: 'fill' },
      { label: 'Effective Capacity < 50%', color: '#22c55e', type: 'fill' },
    ],
  },
];

function renderLegendSymbol(item: LegendItem) {
  switch (item.type) {
    case 'fill':
      return (
        <div
          className="w-5 h-5 rounded border border-slate-300"
          style={{ backgroundColor: item.color }}
          aria-hidden="true"
        />
      );
    case 'line':
      return (
        <div className="w-5 h-5 flex items-center" aria-hidden="true">
          <div className="w-full h-1.5 rounded" style={{ backgroundColor: item.color }} />
        </div>
      );
    case 'circle':
      return (
        <div className="w-5 h-5 flex items-center justify-center" aria-hidden="true">
          <div className="w-3 h-3 rounded-full border-2 border-slate-300" style={{ backgroundColor: item.color }} />
        </div>
      );
    case 'pattern':
      return (
        <div className="w-5 h-5 rounded border border-slate-300 relative overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0" style={{ backgroundColor: item.color }} />
          {item.pattern === 'diagonal-lines' && (
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.3)_4px,rgba(255,255,255,0.3)_8px)]" />
          )}
          {item.pattern === 'dots' && (
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.4)_2px,transparent_2px)] bg-[size:8px_8px]" />
          )}
        </div>
      );
    default:
      return null;
  }
}

export function LegendPanel() {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    LEGEND_GROUPS.reduce((acc, g) => ({ ...acc, [g.id]: g.expanded ?? false }), {})
  );

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Legend
      </h3>

      <div className="space-y-1" role="list" aria-label="Map legend">
        {LEGEND_GROUPS.map((group) => (
          <LegendGroup
            key={group.id}
            group={group}
            isExpanded={expandedGroups[group.id]}
            onToggle={toggleGroup}
          />
        ))}
      </div>
    </div>
  );
}

interface LegendGroupProps {
  group: LegendGroup;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

function LegendGroup({ group, isExpanded, onToggle }: LegendGroupProps) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => onToggle(group.id)}
        className="w-full flex items-center justify-between p-2 hover:bg-slate-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-medium text-slate-900">{group.title}</span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-2 space-y-2" role="listitem">
          {group.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2" role="listitem">
              {renderLegendSymbol(item)}
              <span className="text-xs text-slate-700">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}