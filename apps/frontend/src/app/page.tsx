'use client';

import { useEffect, useState } from 'react';

import { Sidebar } from '@/components/ui/Sidebar';
import { Header } from '@/components/ui/Header';
import { StatusBar } from '@/components/ui/StatusBar';

import { KPIPanel } from '@/components/panels/KPIPanel';
import { AssignmentsTable } from '@/components/panels/AssignmentsTable';
import { SiteCapacityPanel } from '@/components/panels/SiteCapacityPanel';
import { EventControls } from '@/components/panels/EventControls';
import { PlanVersionPanel } from '@/components/panels/PlanVersionPanel';

import {
  approvePlan,
  getActivePlan,
} from '@/lib/api';

import { default as nextDynamic } from 'next/dynamic';

const MapContainer = nextDynamic(
  () =>
    import('@/components/map/MapContainer').then(
      (mod) => ({
        default: mod.MapContainer,
      })
    ),
  { ssr: false }
);

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

export default function HomePage() {
  const [mapLoaded, setMapLoaded] =
    useState(false);

  const [approvalStatus, setApprovalStatus] =
    useState<'PENDING' | 'APPROVED'>(
      'PENDING'
    );

  const [approving, setApproving] =
    useState(false);

  const [approvalMessage, setApprovalMessage] =
    useState('');

  const [planSummary, setPlanSummary] =
    useState<PlanSummary>({
      assignments: 0,
      assignedPopulation: 0,
      unmetHabitations: 0,
      totalDistance: 0,
      planStatus: 'UNKNOWN',
      approvalStatus: 'PENDING',
      lastEventType: null,
      lastEventTarget: null,
    });

  /*
   * Load current plan from backend.
   */
  const loadPlanSummary = async () => {
    try {
      const result =
        await getActivePlan();

      const plan =
        result?.plan;

      if (!plan) {
        return;
      }

      const backendApproval =
        String(
          plan.approval_status ??
          'PENDING'
        ).toUpperCase();

      const normalizedApproval =
        backendApproval === 'APPROVED'
          ? 'APPROVED'
          : 'PENDING';

      setApprovalStatus(
        normalizedApproval
      );

      setPlanSummary({
        assignments:
          Array.isArray(
            plan.assignments
          )
            ? plan.assignments.length
            : 0,

        assignedPopulation:
          Number(
            plan.total_assigned_population ??
            0
          ),

        unmetHabitations:
          Array.isArray(
            plan.unmet_habitations
          )
            ? plan.unmet_habitations.length
            : Number(
              plan.total_unmet_population ??
              0
            ),

        totalDistance:
          Number(
            plan.total_distance_km ??
            0
          ),

        planStatus: String(
          plan.plan_status ??
          plan.optimization_status ??
          plan.status ??
          'UNKNOWN'
        ).toUpperCase(),

        approvalStatus:
          normalizedApproval,

        lastEventType:
          plan.last_event?.event_type ??
          null,

        lastEventTarget:
          plan.last_event?.target_id ??
          null,
      });
    } catch (error) {
      console.warn(
        'Could not load current plan:',
        error
      );
    }
  };

  /*
   * Load plan immediately and keep the
   * approval panel synced with backend
   * changes after disaster simulation.
   */
  useEffect(() => {
    loadPlanSummary();

    const timer =
      setInterval(() => {
        loadPlanSummary();
      }, 4000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  /*
   * Human authority approval.
   */
  const handleApprovePlan =
    async () => {
      if (approving) {
        return;
      }

      setApproving(true);
      setApprovalMessage('');

      try {
        const result =
          await approvePlan();

        const backendStatus =
          String(
            result?.approval_status ??
            result?.status ??
            'APPROVED'
          ).toUpperCase();

        if (
          backendStatus === 'APPROVED' ||
          backendStatus === 'SUCCESS' ||
          !backendStatus
        ) {
          setApprovalStatus(
            'APPROVED'
          );

          setApprovalMessage(
            'Plan approved successfully. This relocation plan is now authorized for execution.'
          );

          await loadPlanSummary();
        } else {
          setApprovalMessage(
            result?.message ??
            `Approval response: ${backendStatus}`
          );
        }
      } catch (error: any) {
        console.error(
          'Plan approval failed:',
          error
        );

        setApprovalMessage(
          error?.message ??
          'Plan approval failed. Please review the active plan and try again.'
        );
      } finally {
        setApproving(false);
      }
    };

  return (
    <div className="h-screen w-full flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL 1 */}
        <Sidebar
          position="left"
          defaultOpen={true}
          width={380}
        >
          <div className="space-y-4 p-4 overflow-y-auto h-full">
            <KPIPanel />

            <AssignmentsTable />

            <SiteCapacityPanel />
          </div>
        </Sidebar>

        {/* LEFT PANEL 2 */}
        <Sidebar
          position="left"
          defaultOpen={true}
          width={380}
        >
          <div className="space-y-4 p-4 overflow-y-auto h-full">

            <EventControls />

            <PlanVersionPanel />

            {/* HUMAN DECISION */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

              {/* HEADER */}
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between gap-3">

                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Human Decision
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Review the current relocation plan before authorization
                    </div>
                  </div>

                  <div
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide whitespace-nowrap ${approvalStatus ===
                        'APPROVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                      }`}
                  >
                    {approvalStatus ===
                      'APPROVED'
                      ? 'APPROVED'
                      : 'PENDING REVIEW'}
                  </div>
                </div>
              </div>

              <div className="p-4">

                {/* PLAN READY CARD */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3">

                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold tracking-wide text-slate-800">
                      PLAN READY FOR APPROVAL
                    </div>

                    <div
                      className={`text-[10px] font-bold px-2 py-1 rounded ${planSummary.planStatus ===
                          'OPTIMAL'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                        }`}
                    >
                      {planSummary.planStatus}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">

                    {/* ASSIGNMENTS */}
                    <div className="rounded-md bg-white border border-slate-200 p-2.5">
                      <div className="text-[10px] text-slate-500">
                        Assignments
                      </div>

                      <div className="text-lg font-extrabold text-slate-900">
                        {planSummary.assignments}
                      </div>
                    </div>

                    {/* ASSIGNED POPULATION */}
                    <div className="rounded-md bg-white border border-slate-200 p-2.5">
                      <div className="text-[10px] text-slate-500">
                        Assigned Population
                      </div>

                      <div className="text-lg font-extrabold text-slate-900">
                        {planSummary.assignedPopulation.toLocaleString()}
                      </div>
                    </div>

                    {/* UNMET HABITATIONS */}
                    <div className="rounded-md bg-white border border-slate-200 p-2.5">
                      <div className="text-[10px] text-slate-500">
                        Unmet Habitations
                      </div>

                      <div
                        className={`text-lg font-extrabold ${planSummary.unmetHabitations >
                            0
                            ? 'text-red-600'
                            : 'text-emerald-600'
                          }`}
                      >
                        {planSummary.unmetHabitations}
                      </div>
                    </div>

                    {/* TOTAL DISTANCE */}
                    <div className="rounded-md bg-white border border-slate-200 p-2.5">
                      <div className="text-[10px] text-slate-500">
                        Relocation Distance
                      </div>

                      <div className="text-lg font-extrabold text-slate-900">
                        {planSummary.totalDistance.toFixed(
                          1
                        )}{' '}
                        <span className="text-xs font-semibold">
                          km
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LATEST EVENT */}
                {planSummary.lastEventType && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-3">

                    <div className="flex items-start gap-2">

                      <div className="text-lg">
                        🚨
                      </div>

                      <div>
                        <div className="text-xs font-bold text-red-800">
                          PLAN CHANGED AFTER DISASTER EVENT
                        </div>

                        <div className="text-[11px] text-red-700 mt-1">
                          Event:{' '}
                          <span className="font-semibold">
                            {planSummary.lastEventType}
                          </span>
                        </div>

                        {planSummary.lastEventTarget && (
                          <div className="text-[11px] text-red-700 mt-0.5">
                            Target:{' '}
                            <span className="font-semibold">
                              {planSummary.lastEventTarget}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* EXPLANATION */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3">

                  <div className="flex items-start gap-2">

                    <div className="text-lg">
                      👤
                    </div>

                    <div>
                      <div className="text-xs font-bold text-amber-800">
                        HUMAN REVIEW REQUIRED
                      </div>

                      <div className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                        Aapda Setu has generated
                        the feasible relocation
                        plan. The responsible
                        authority reviews the
                        assignments, capacity and
                        route conditions before
                        approving execution.
                      </div>
                    </div>
                  </div>
                </div>

                {/* APPROVAL STATUS */}
                <div
                  className={`rounded-lg border p-3 mb-3 ${approvalStatus ===
                      'APPROVED'
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-amber-200 bg-amber-50'
                    }`}
                >
                  <div className="flex items-start gap-3">

                    <div className="text-lg">
                      {approvalStatus ===
                        'APPROVED'
                        ? '✅'
                        : '👤'}
                    </div>

                    <div>
                      <div
                        className={`text-sm font-bold ${approvalStatus ===
                            'APPROVED'
                            ? 'text-emerald-800'
                            : 'text-amber-800'
                          }`}
                      >
                        {approvalStatus ===
                          'APPROVED'
                          ? 'Relocation plan approved'
                          : 'Plan requires human approval'}
                      </div>

                      <div className="text-[11px] mt-1 text-slate-600">
                        {approvalStatus ===
                          'APPROVED'
                          ? 'This current relocation plan has received authority approval.'
                          : 'Review the plan summary above before authorizing execution.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* APPROVE BUTTON */}
                <button
                  type="button"
                  onClick={
                    handleApprovePlan
                  }
                  disabled={
                    approving ||
                    approvalStatus ===
                    'APPROVED'
                  }
                  className={`w-full rounded-lg px-4 py-3 text-sm font-bold transition ${approvalStatus ===
                      'APPROVED'
                      ? 'bg-emerald-100 text-emerald-700 cursor-default'
                      : approving
                        ? 'bg-slate-300 text-slate-600 cursor-wait'
                        : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]'
                    }`}
                >
                  {approvalStatus ===
                    'APPROVED'
                    ? '✓ PLAN APPROVED'
                    : approving
                      ? 'APPROVING PLAN...'
                      : 'APPROVE CURRENT PLAN'}
                </button>

                {/* RESPONSE MESSAGE */}
                {approvalMessage && (
                  <div
                    className={`mt-3 rounded-lg px-3 py-2 text-[11px] ${approvalStatus ===
                        'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                  >
                    {approvalMessage}
                  </div>
                )}

                {/* PRINCIPLE */}
                <div className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                  Aapda Setu recommends and
                  re-plans. The human authority
                  makes the final operational
                  decision.
                </div>
              </div>
            </div>
          </div>
        </Sidebar>

        {/* MAIN MAP */}
        <main className="flex-1 relative min-w-0">
          <MapContainer
            onLoad={() =>
              setMapLoaded(true)
            }
          />
        </main>

        {/* RIGHT DETAILS */}
        <Sidebar
          position="right"
          defaultOpen={false}
        >
          <div className="p-4 overflow-y-auto h-full">
            <div className="text-sm text-slate-500">
              Detail panel - click a feature
            </div>
          </div>
        </Sidebar>
      </div>

      <StatusBar
        mapLoaded={mapLoaded}
      />
    </div>
  );
}