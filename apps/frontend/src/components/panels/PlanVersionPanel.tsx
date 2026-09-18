"use client";

import { useActivePlan, useApprovePlan } from "@/hooks/useApi";
import { Badge, Button, Card } from "@/components/ui";

interface PlanVersionPanelProps {
  onApprove?: () => void;
  approvalStatus: "PENDING" | "APPROVED";
}

export function PlanVersionPanel({ onApprove, approvalStatus }: PlanVersionPanelProps) {
  const { data: activePlan } = useActivePlan();
  const approveMutation = useApprovePlan();

  const plan = activePlan?.plan;

  const handleApprove = async () => {
    if (!plan || onApprove) {
      onApprove?.();
      return;
    }
  };

  if (!plan) {
    return (
      <Card className="p-8 text-center">
        <div className="text-5xl mb-3">📋</div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Plan</h3>
        <p className="text-sm text-slate-500">Run optimization or simulate an event to generate a relocation plan.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Plan Versions
        </h3>
      </div>

      <Card variant="outlined" className="p-3">
        <div className="flex items-center gap-3 bg-slate-900 text-white p-3 rounded-lg border-l-4 border-blue-600">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-mono text-sm">v{plan.version}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={plan.status === "active" ? "success" : plan.status === "invalid" ? "danger" : "neutral"} size="sm" dot dotColor={plan.status === "active" ? "bg-green-500" : plan.status === "invalid" ? "bg-red-500" : "bg-slate-400"}>
                  {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                </Badge>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Assigned: {plan.total_assigned_population?.toLocaleString() ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Unmet: {plan.total_unmet_population?.toLocaleString() ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l4-4m-4 4l4 4m-6 11V7a2 2 0 012-2h6a2 2 0 012 2v11a2 2 0 01-2 2h-4m-4 0H9m4 0a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v3.5" />
                  </svg>
                  {new Date().toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </Card>
    </Card>
  );
}