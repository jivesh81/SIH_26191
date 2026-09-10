'use client';

import { useState } from 'react';

export function Header() {
  const [scenario, setScenario] = useState<'baseline' | 'rainfall' | 'bridge-collapse' | 'capacity-reduction'>('baseline');

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-aapda-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v2m0 0H9m3 0h3" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Aapda Setu</h1>
          <p className="text-xs text-slate-500">Disaster Decision Support • Barpeta Demo</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value as typeof scenario)}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-aapda-500"
          aria-label="Simulation scenario"
        >
          <option value="baseline">Baseline</option>
          <option value="rainfall">Heavy Rainfall</option>
          <option value="bridge-collapse">Bridge Collapse</option>
          <option value="capacity-reduction">Shelter Capacity Reduction</option>
        </select>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-slate-600 font-medium">API Connected</span>
        </div>

        <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors" aria-label="Settings">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
}