'use client';

import { KPIPanel } from '@/components/panels/KPIPanel';
import { AssignmentsTable } from '@/components/panels/AssignmentsTable';
import { SiteCapacityPanel } from '@/components/panels/SiteCapacityPanel';
import { EventControls } from '@/components/panels/EventControls';
import { getActivePlan, approvePlan } from '@/lib/api';
import { useEffect, useState } from 'react';

interface PlanSummary {
  assignments: number;
  assignedPopulation: number;
  unmetHabitations: number;
  totalDistance: number;
  planStatus: string;
  approvalStatus: string;
  lastEventType: string | null;
  lastEventTarget: string | null;
}

export function OverviewView() {
  const [approvalStatus, setApprovalStatus] = useState<'PENDING' | 'APPROVED'>('PENDING');
  const [approving, setApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');

  const [planSummary, setPlanSummary] = useState<PlanSummary>({
    assignments: 0,
    assignedPopulation: 0,
    unmetHabitations: 0,
    totalDistance: 0,
    planStatus: 'UNKNOWN',
    approvalStatus: 'PENDING',
    lastEventType: null,
    lastEventTarget: null,
  });

  const loadPlanSummary = async () => {
    try {
      const result = await getActivePlan();
      const plan = result?.plan;
      if (!plan) return;

      const backendApproval = String(plan.approval_status ?? 'PENDING').toUpperCase();
      const normalizedApproval = backendApproval === 'APPROVED' ? 'APPROVED' : 'PENDING';
      setApprovalStatus(normalizedApproval);

      setPlanSummary({
        assignments: Array.isArray(plan.assignments) ? plan.assignments.length : 0,
        assignedPopulation: Number(plan.total_assigned_population ?? 0),
        unmetHabitations: Array.isArray(plan.unmet_habitations)
          ? plan.unmet_habitations.length
          : Number(plan.total_unmet_population ?? 0),
        totalDistance: Number(plan.total_distance_km ?? 0),
        planStatus: String(plan.plan_status ?? plan.optimization_status ?? plan.status ?? 'UNKNOWN').toUpperCase(),
        approvalStatus: normalizedApproval,
        lastEventType: plan.last_event?.event_type ?? null,
        lastEventTarget: plan.last_event?.target_id ?? null,
      });
    } catch (error) {
      console.warn('Could not load current plan:', error);
    }
  };

  const handleApprovePlan = async () => {
    if (approving) return;
    setApproving(true);
    setApprovalMessage('');

    try {
      const result = await approvePlan();
      const backendStatus = String(result?.approval_status ?? result?.status ?? 'APPROVED').toUpperCase();

      if (backendStatus === 'APPROVED' || backendStatus === 'SUCCESS' || !backendStatus) {
        setApprovalStatus('APPROVED');
        setApprovalMessage('Plan approved successfully. This relocation plan is now authorized for execution.');
        await loadPlanSummary();
      } else {
        setApprovalMessage(result?.message ?? `Approval response: ${backendStatus}`);
      }
    } catch (error: any) {
      console.error('Plan approval failed:', error);
      setApprovalMessage(error?.message ?? 'Plan approval failed. Please review the active plan and try again.');
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    loadPlanSummary();
    const timer = setInterval(loadPlanSummary, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      {/* KPI Cards */}
      <KPIPanel />

      {/* Assignments Table */}
      <AssignmentsTable />

      {/* Site Capacity Panel - Core capacity workflow */}
      <SiteCapacityPanel />

      {/* Disaster Simulation */}
      <EventControls />

      {/* Plan Version & Approval */}
      <PlanVersionPanel onApprove={handleApprovePlan} approvalStatus={approvalStatus} />

      {/* Human Decision Panel */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span role="img" aria-label="person">👤</span>
                Human Decision
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Review the current relocation plan before authorization
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide whitespace-nowrap ${approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {approvalStatus === 'APPROVED' ? 'APPROVED' : 'PENDING REVIEW'}
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Plan Ready Card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold tracking-wide text-slate-800">PLAN READY FOR APPROVAL</div>
              <div className={`text-[10px] font-bold px-2 py-1 rounded ${planSummary.planStatus === 'OPTIMAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                {planSummary.planStatus}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-white border border-slate-200 p-2.5">
                <div className="text-[10px] text-slate-500">Assignments</div>
                <div className="text-lg font-extrabold text-slate-900">{planSummary.assignments}</div>
              </div>
              <div className="rounded-md bg-white border border-slate-200 p-2.5">
                <div className="text-[10px] text-slate-500">Assigned Population</div>
                <div className="text-lg font-extrabold text-slate-900">{planSummary.assignedPopulation.toLocaleString()}</div>
              </div>
              <div className="rounded-md bg-white border border-slate-200 p-2.5">
                <div className="text-[10px] text-slate-500">Unmet Habitations</div>
                <div className={`text-lg font-extrabold ${planSummary.unmetHabitations > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {planSummary.unmetHabitations}
                </div>
              </div>
              <div className="rounded-md bg-white border border-slate-200 p-2.5">
                <div className="text-[10px] text-slate-500">Relocation Distance</div>
                <div className="text-lg font-extrabold text-slate-900">{planSummary.totalDistance.toFixed(1)} <span className="text-xs font-semibold">km</span></div>
              </div>
            </div>
          </div>

          {/* Latest Event */}
          {planSummary.lastEventType && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-3">
              <div className="flex items-start gap-2">
                <div className="text-lg">🚨</div>
                <div>
                  <div className="text-xs font-bold text-red-800">PLAN CHANGED AFTER DISASTER EVENT</div>
                  <div className="text-[11px] text-red-700 mt-1">Event: <span className="font-semibold">{planSummary.lastEventType}</span></div>
                  {planSummary.lastEventTarget && (
                    <div className="text-[11px] text-red-700 mt-0.5">Target: <span className="font-semibold">{planSummary.lastEventTarget}</span></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3">
            <div className="flex items-start gap-2">
              <div className="text-lg">👤</div>
              <div>
                <div className="text-xs font-bold text-amber-800">HUMAN REVIEW REQUIRED</div>
                <div className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  Aapda Setu has generated the feasible relocation plan. The responsible authority reviews the assignments, capacity and route conditions before approving execution.
                </div>
              </div>
            </div>
          </div>

          {/* Approval Status */}
          <div className={`rounded-lg border p-3 mb-3 ${approvalStatus === 'APPROVED' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex items-start gap-3">
              <div className="text-lg">{approvalStatus === 'APPROVED' ? '✅' : '👤'}</div>
              <div>
                <div className={`text-sm font-bold ${approvalStatus === 'APPROVED' ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {approvalStatus === 'APPROVED' ? 'Relocation plan approved' : 'Plan requires human approval'}
                </div>
                <div className="text-[11px] mt-1 text-slate-600">
                  {approvalStatus === 'APPROVED' ? 'This current relocation plan has received authority approval.' : 'Review the plan summary above before authorizing execution.'}
                </div>
              </div>
            </div>
          </div>

          {/* Approve Button */}
          <button
            onClick={handleApprovePlan}
            disabled={approving || approvalStatus === 'APPROVED'}
            className={`w-full rounded-lg px-4 py-3 text-sm font-bold transition ${approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 cursor-default' : approving ? 'bg-slate-300 text-slate-600 cursor-wait' : 'btn-primary'}`}
          >
            {approvalStatus === 'APPROVED' ? '✓ PLAN APPROVED' : approving ? 'APPROVING PLAN...' : 'APPROVE CURRENT PLAN'}
          </button>

          {approvalMessage && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-[11px] ${approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {approvalMessage}
            </div>
          )}

          <div className="text-[10px] text-slate-400 mt-3 leading-relaxed">
            Aapda Setu recommends and re-plans. The human authority makes the final operational decision.
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanVersionPanel({ onApprove, approvalStatus }: { onApprove?: () => void; approvalStatus: 'PENDING' | 'APPROVED' }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span role="img" aria-label="document">📋</span>
          Plan Versions
        </h3>
      </div>

      <div className="space-y-2">
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="p-3 flex items-center gap-3 bg-slate-900 text-white border-l-4 border-blue-600">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-mono text-sm">v1</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                    <span role="img" aria-label="check">✓</span>
                    Active
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1"><span role="img" aria-label="clock">🕐</span> Assigned: 10,850</span>
                  <span className="flex items-center gap-1"><span role="img" aria-label="warning">⚠️</span> Unmet: 9,750</span>
                  <span className="flex items-center gap-1"><span role="img" aria-label="calendar">📅</span> {new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
            <span role="img" aria-label="chevron">▼</span>
          </div>
        </div>
      </div>
    </div>
  );
}