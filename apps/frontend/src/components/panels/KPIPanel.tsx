'use client';

import { useKPIs } from '@/hooks/useApi';

export function KPIPanel() {
  const { vulnerablePopulation, totalEffectiveCapacity, assignedPopulation, unmetPopulation, activePlanVersion, activePlanStatus, isLoading, error } = useKPIs();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-lg border border-slate-200">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-1" />
            <div className="h-8 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Failed to load KPIs
      </div>
    );
  }

  const kpis = [
    {
      label: 'Vulnerable Population',
      value: vulnerablePopulation?.toLocaleString() || '—',
      icon: '👥',
      color: 'bg-slate-500',
    },
    {
      label: 'Effective Capacity',
      value: totalEffectiveCapacity?.toLocaleString() || '—',
      icon: '🏕️',
      color: 'bg-green-500',
    },
    {
      label: 'Assigned Population',
      value: assignedPopulation?.toLocaleString() || '—',
      icon: '✅',
      color: 'bg-blue-500',
    },
    {
      label: 'Unmet Population',
      value: unmetPopulation?.toLocaleString() || '—',
      icon: '⚠️',
      color: unmetPopulation && unmetPopulation > 0 ? 'bg-red-500' : 'bg-green-500',
    },
    {
      label: 'Active Plan Version',
      value: activePlanVersion ? `v${activePlanVersion}` : '—',
      icon: '📋',
      color: 'bg-purple-500',
    },
    {
      label: 'Plan Status',
      value: activePlanStatus || '—',
      icon: '📊',
      color: activePlanStatus === 'active' ? 'bg-green-500' : activePlanStatus === 'invalid' ? 'bg-red-500' : 'bg-slate-500',
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Key Metrics
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{kpi.icon}</span>
              <span className="text-xs text-slate-500 font-medium">{kpi.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${kpi.color}`} />
              <span className="text-lg font-bold text-slate-900 tabular-nums">{kpi.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}