'use client';

import { useView, ViewName, VIEW_CONFIG } from '@/context/ViewContext';
import { useDemoFlow, DEMO_FLOW_STEPS } from '@/context/DemoFlowContext';
import Link from 'next/link';

export function CommandCenterHeader() {
  const { currentView } = useView();
  const { isActive, currentStep, nextStep, previousStep, endDemoFlow } = useDemoFlow();
  const activeItem = VIEW_CONFIG[currentView];
  const demoStep = DEMO_FLOW_STEPS[currentStep];

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-full px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate sm:text-xl">
                {activeItem?.label || 'Command Center'}
              </h1>
              <p className="text-sm text-slate-600 truncate mt-0.5 hidden sm:block">
                {activeItem?.description || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Geography</span>
              <span className="text-sm font-semibold text-slate-900">Barpeta, Assam</span>
            </div>

            {isActive && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-xs font-semibold text-blue-700">Demo Flow</span>
                <span className="text-xs text-slate-600 px-2 py-0.5 rounded bg-white/50">
                  {currentStep + 1} / {DEMO_FLOW_STEPS.length}
                </span>
                <span className="text-xs text-blue-700 truncate max-w-[200px]">{demoStep?.label}</span>
                <button onClick={previousStep} disabled={currentStep === 0} className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50">← Prev</button>
                <button onClick={nextStep} disabled={currentStep >= DEMO_FLOW_STEPS.length - 1} className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50">Next →</button>
                <button onClick={endDemoFlow} className="px-2 py-1 text-xs text-red-600 hover:text-red-700">End</button>
              </div>
            )}

            <Link
              href="/"
              className="btn-secondary px-4 py-2 text-sm hidden sm:inline-flex"
            >
              ← Home
            </Link>
          </div>
        </div>

        {isActive && (
          <div className="lg:hidden px-6 pb-4">
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-xs font-semibold text-blue-700">Demo Flow: {currentStep + 1} / {DEMO_FLOW_STEPS.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={previousStep} disabled={currentStep === 0} className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50">←</button>
                <button onClick={nextStep} disabled={currentStep >= DEMO_FLOW_STEPS.length - 1} className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50">→</button>
                <button onClick={endDemoFlow} className="px-2 py-1 text-xs text-red-600 hover:text-red-700">End</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}