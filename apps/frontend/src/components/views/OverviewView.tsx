"use client";

import { KPIPanel } from "@/components/panels/KPIPanel";
import { AssignmentsTable } from "@/components/panels/AssignmentsTable";
import { SiteCapacityPanel } from "@/components/panels/SiteCapacityPanel";
import { EventControls } from "@/components/panels/EventControls";
import { PlanVersionPanel } from "@/components/panels/PlanVersionPanel";
import { getActivePlan, approvePlan } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";

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
  const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED">("PENDING");
  const [approving, setApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");

  const [planSummary, setPlanSummary] = useState<PlanSummary>({
    assignments: 0,
    assignedPopulation: 0,
    unmetHabitations: 0,
    totalDistance: 0,
    planStatus: "UNKNOWN",
    approvalStatus: "PENDING",
    lastEventType: null,
    lastEventTarget: null,
  });

  const loadPlanSummary = async () => {
    try {
      const result = await getActivePlan();
      const plan = result?.plan;
      if (!plan) return;

      const backendApproval = String(plan.approval_status ?? "PENDING").toUpperCase();
      const normalizedApproval = backendApproval === "APPROVED" ? "APPROVED" : "PENDING";
      setApprovalStatus(normalizedApproval);

      setPlanSummary({
        assignments: Array.isArray(plan.assignments) ? plan.assignments.length : 0,
        assignedPopulation: Number(plan.total_assigned_population ?? 0),
        unmetHabitations: Array.isArray(plan.unmet_habitations) ? plan.unmet_habitations.length : Number(plan.total_unmet_population ?? 0),
        totalDistance: Number(plan.total_distance_km ?? 0),
        planStatus: String(plan.plan_status ?? plan.optimization_status ?? plan.status ?? "UNKNOWN").toUpperCase(),
        approvalStatus: normalizedApproval,
        lastEventType: plan.last_event?.event_type ?? null,
        lastEventTarget: plan.last_event?.target_id ?? null,
      });
    } catch (error) {
      console.warn("Could not load current plan:", error);
    }
  };

  const handleApprovePlan = async () => {
    if (approving) return;
    setApproving(true);
    setApprovalMessage("");

    try {
      const result = await approvePlan();
      const backendStatus = String(result?.approval_status ?? result?.status ?? "APPROVED").toUpperCase();

      if (backendStatus === "APPROVED" || backendStatus === "SUCCESS" || !backendStatus) {
        setApprovalStatus("APPROVED");
        setApprovalMessage("Plan approved successfully. This relocation plan is now authorized for execution.");
        await loadPlanSummary();
      } else {
        setApprovalMessage(result?.message ?? `Approval response: ${backendStatus}`);
      }
    } catch (error: any) {
      console.error("Plan approval failed:", error);
      setApprovalMessage(error?.message ?? "Plan approval failed. Please review the active plan and try again.");
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
    <div className="space-y-5">
      <KPIPanel />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AssignmentsTable />
          <SiteCapacityPanel />
        </div>

        <div className="space-y-4">
          <EventControls />
          <PlanVersionPanel onApprove={handleApprovePlan} approvalStatus={approvalStatus} />
        </div>
      </div>

      <Card className="space-y-4">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                Human Decision
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Review the current relocation plan before authorization</div>
            </div>
            <Badge variant={approvalStatus === "APPROVED" ? "success" : "warning"} size="sm" dot dotColor={approvalStatus === "APPROVED" ? "bg-green-500" : "bg-amber-500"}>
              {approvalStatus === "APPROVED" ? "APPROVED" : "PENDING REVIEW"}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <Card variant="outlined" className="p-3 border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold tracking-wide text-slate-800">PLAN READY FOR APPROVAL</div>
              <Badge variant={planSummary.planStatus === "OPTIMAL" ? "success" : "info"} size="sm" dot dotColor={planSummary.planStatus === "OPTIMAL" ? "bg-green-500" : "bg-blue-500"}>
                {planSummary.planStatus}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Card variant="outlined" className="p-3 bg-white border-slate-200">
                <div className="text-[10px] text-slate-500">Assignments</div>
                <div className="text-lg font-extrabold text-slate-900">{planSummary.assignments}</div>
              </Card>
              <Card variant="outlined" className="p-3 bg-white border-slate-200">
                <div className="text-[10px] text-slate-500">Assigned Population</div>
                <div className="text-lg font-extrabold text-slate-900">{planSummary.assignedPopulation.toLocaleString()}</div>
              </Card>
              <Card variant="outlined" className="p-3 bg-white border-slate-200">
                <div className="text-[10px] text-slate-500">Unmet Habitations</div>
                <div className={`text-lg font-extrabold ${planSummary.unmetHabitations > 0 ? "text-red-600" : "text-green-600"}`}>
                  {planSummary.unmetHabitations}
                </div>
              </Card>
              <Card variant="outlined" className="p-3 bg-white border-slate-200">
                <div className="text-[10px] text-slate-500">Relocation Distance</div>
                <div className="text-lg font-extrabold text-slate-900">{planSummary.totalDistance.toFixed(1)} <span className="text-xs font-semibold">km</span></div>
              </Card>
            </div>
          </Card>

          {planSummary.lastEventType && (
            <Card variant="outlined" className="p-3 border-red-200 bg-red-50">
              <div className="flex items-start gap-2">
                <div className="text-lg">⚠️</div>
                <div>
                  <div className="text-xs font-bold text-red-800">PLAN CHANGED AFTER DISASTER EVENT</div>
                  <div className="text-[11px] text-red-700 mt-1">Event: <span className="font-semibold">{planSummary.lastEventType}</span></div>
                  {planSummary.lastEventTarget && (
                    <div className="text-[11px] text-red-700 mt-0.5">Target: <span className="font-semibold">{planSummary.lastEventTarget}</span></div>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card variant="outlined" className="p-3 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-2">
              <div className="text-lg">👤</div>
              <div>
                <div className="text-xs font-bold text-amber-800">HUMAN REVIEW REQUIRED</div>
                <div className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  Aapda Setu has generated the feasible relocation plan. The responsible authority reviews the assignments, capacity and route conditions before approving execution.
                </div>
              </div>
            </div>
          </Card>

          <Card variant="outlined" className={`p-3 ${approvalStatus === "APPROVED" ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-3">
              <div className="text-lg">{approvalStatus === "APPROVED" ? "✅" : "👤"}</div>
              <div>
                <div className={`text-sm font-bold ${approvalStatus === "APPROVED" ? "text-green-800" : "text-amber-800"}`}>
                  {approvalStatus === "APPROVED" ? "Relocation plan approved" : "Plan requires human approval"}
                </div>
                <div className="text-[11px] mt-1 text-slate-600">
                  {approvalStatus === "APPROVED" ? "This current relocation plan has received authority approval." : "Review the plan summary above before authorizing execution."}
                </div>
              </div>
            </div>
          </Card>

          <Button
            variant={approvalStatus === "APPROVED" ? "secondary" : "primary"}
            disabled={approving || approvalStatus === "APPROVED"}
            fullWidth
            onClick={handleApprovePlan}
          >
            {approvalStatus === "APPROVED" ? "✓ PLAN APPROVED" : approving ? "APPROVING PLAN..." : "APPROVE CURRENT PLAN"}
          </Button>

          {approvalMessage && (
            <div className={`text-xs rounded-lg px-3 py-2 ${approvalStatus === "APPROVED" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {approvalMessage}
            </div>
          )}

          <div className="text-[10px] text-slate-400 leading-relaxed">
            Aapda Setu recommends and re-plans. The human authority makes the final operational decision.
          </div>
        </div>
      </Card>
    </div>
  );
}