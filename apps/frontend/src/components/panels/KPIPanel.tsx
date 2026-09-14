'use client';

import { useKPIs } from '@/hooks/useApi';

export function KPIPanel() {
  const { vulnerablePopulation, totalEffectiveCapacity, assignedPopulation, unmetPopulation, activePlanVersion, activePlanStatus, isLoading, error } = useKPIs();

  const kpis = [
    {
      label: 'Vulnerable Population',
      value: vulnerablePopulation?.toLocaleString() ?? '—',
      icon: '👥',
      color: 'blue',
      trend: 'Live from backend',
    },
    {
      label: 'Effective Capacity',
      value: totalEffectiveCapacity?.toLocaleString() ?? '—',
      icon: '🏕️',
      color: 'green',
      trend: totalEffectiveCapacity && vulnerablePopulation
        ? `${Math.round((totalEffectiveCapacity / vulnerablePopulation) * 100)}% coverage`
        : 'Live from backend',
    },
    {
      label: 'Assigned Population',
      value: assignedPopulation?.toLocaleString() ?? '—',
      icon: '✅',
      color: 'blue',
      trend: activePlanVersion ? `Plan v${activePlanVersion}` : 'No active plan',
    },
    {
      label: 'Unmet Population',
      value: unmetPopulation?.toLocaleString() ?? '—',
      icon: '⚠️',
      color: unmetPopulation && unmetPopulation > 0 ? 'red' : 'green',
      trend: unmetPopulation && unmetPopulation > 0 ? 'Requires attention' : 'Fully covered',
    },
    {
      label: 'Active Plan Version',
      value: activePlanVersion ? `v${activePlanVersion}` : '—',
      icon: '📋',
      color: 'purple',
      trend: `Status: ${activePlanStatus}`,
    },
    {
      label: 'Plan Status',
      value: activePlanStatus?.toUpperCase() ?? '—',
      icon: '📊',
      color: activePlanStatus === 'active' ? 'green' : activePlanStatus === 'invalid' ? 'red' : 'slate',
      trend: 'Auto-refresh: 5s',
    },
  ];

  const colorStyles: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', iconBg: 'bg-green-100' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', iconBg: 'bg-red-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', iconBg: 'bg-purple-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', iconBg: 'bg-orange-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', iconBg: 'bg-amber-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', iconBg: 'bg-slate-100' },
  };

  if (isLoading) {
    return (
      <div className="card-elevated rounded-xl p-5 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Key Metrics
          </h3>
          <span className="status-badge status-badge-active text-xs">LIVE</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card rounded-lg p-5 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-10 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card rounded-xl p-5 bg-red-50 border-red-200">
        <div className="flex items-center gap-2 text-red-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Failed to load KPIs</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-xl p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Key Metrics
        </h3>
        <span className="status-badge status-badge-active text-xs flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          const styles = colorStyles[kpi.color] || colorStyles.slate;
          return (
            <div
              key={idx}
              className={`card rounded-lg p-5 transition-all duration-300 hover:border-opacity-50 hover:-translate-y-1 relative overflow-hidden group ${styles.bg} ${styles.border}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-current/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex items-start justify-between mb-3">
                <span className="text-2xl">{kpi.icon}</span>
                <span className="status-badge status-badge-inactive text-xs">LIVE</span>
              </div>
              <p className="relative z-10 text-xs text-slate-500 mb-1">{kpi.label}</p>
              <p className="relative z-10 text-xl font-extrabold text-slate-900 tabular-nums mb-2">{kpi.value}</p>
              <p className="relative z-10 text-xs text-slate-500">{kpi.trend}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}