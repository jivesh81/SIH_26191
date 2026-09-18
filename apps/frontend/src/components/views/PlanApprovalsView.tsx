"use client";

import { useActivePlan, useApprovePlan, useEventLog } from "@/hooks/useApi";
import { AlertTriangle, AlertCircle, CheckCircle, Clock, RotateCcw, FileText, ChevronDown, ChevronUp, Shield, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, Badge, Button } from "@/components/ui";

interface PlanVersion {
  version: number;
  plan_id: string;
  status: string;
  total_assigned_population: number;
  total_unmet_population: number;
  optimization_status: string;
  created_at: string;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  affected_assignments: string[];
  affected_sites: string[];
  affected_routes: string[];
}

export function PlanApprovalsView() {
  const { data: activePlan } = useActivePlan();
  const { data: eventLog } = useEventLog();
  const approveMutation = useApprovePlan();

  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED">("PENDING");
  const [approving, setApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");

  const versions: PlanVersion[] = [
    {
      version: activePlan?.plan?.version ?? 1,
      plan_id: activePlan?.plan?.plan_id ?? "current",
      status: activePlan?.plan?.status ?? "active",
      total_assigned_population: activePlan?.plan?.total_assigned_population ?? 0,
      total_unmet_population: activePlan?.plan?.total_unmet_population ?? 0,
      optimization_status: activePlan?.plan?.optimization_status ?? "unknown",
      created_at: activePlan?.plan?.created_at ?? new Date().toISOString(),
      invalidated_at: null,
      invalidation_reason: null,
      affected_assignments: [],
      affected_sites: [],
      affected_routes: [],
    },
  ];

  useEffect(() => {
    if (activePlan?.plan?.approval_status) {
      const status = String(activePlan.plan.approval_status).toUpperCase();
      setApprovalStatus(status === "APPROVED" ? "APPROVED" : "PENDING");
    }
  }, [activePlan]);

  const handleApprove = async (version: number) => {
    const plan = versions.find((v) => v.version === version);
    if (!plan || approving) return;

    setApproving(true);
    setApprovalMessage("");

    try {
      const result = await approveMutation.mutateAsync({ plan_id: plan.plan_id });
      if (result.success) {
        setApprovalStatus("APPROVED");
        setApprovalMessage(`Plan v${version} approved. ${result.evacuation_orders_sent} evacuation orders sent.`);
      } else {
        setApprovalMessage(result.error ?? "Approval failed");
      }
    } catch (error: any) {
      setApprovalMessage(error.message ?? "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active": return { icon: <CheckCircle className="w-4 h-4 text-green-600" />, label: "Active", badgeVariant: "success" as const };
      case "invalid": return { icon: <AlertCircle className="w-4 h-4 text-red-600" />, label: "Invalid", badgeVariant: "danger" as const };
      case "superseded": return { icon: <Clock className="w-4 h-4 text-slate-500" />, label: "Superseded", badgeVariant: "neutral" as const };
      default: return { icon: <Clock className="w-4 h-4 text-slate-500" />, label: status, badgeVariant: "neutral" as const };
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Shield className="w-5 h-5 text-slate-500" />Plan Approvals</h2>
        <Badge variant="warning" size="sm">Mock SMS</Badge>
      </div>

      <div className="space-y-3">
        {versions.map((version) => (
          <VersionCard
            key={version.version}
            version={version}
            isExpanded={expandedVersion === version.version}
            onToggle={() => setExpandedVersion(expandedVersion === version.version ? null : version.version)}
            onApprove={handleApprove}
            approvalStatus={approvalStatus}
            approving={approving}
            approvalMessage={approvalMessage}
          />
        ))}
      </div>

      <Card variant="outlined" className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-center gap-2 text-amber-800 mb-3"><AlertTriangle className="w-5 h-5" /><span className="font-semibold">Approval Workflow</span></div>
        <div className="space-y-2 text-sm text-amber-700">
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-xs font-bold">1</span><span>Disaster event occurs or risk threshold crossed</span></div>
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-xs font-bold">2</span><span>System re-optimizes and generates new plan</span></div>
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-xs font-bold">3</span><span>New plan marked <strong>PENDING APPROVAL</strong></span></div>
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-xs font-bold">4</span><span>Human authority reviews assignments, capacity & routes</span></div>
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-800 text-xs font-bold">5</span><span className="text-green-800 font-semibold">Authority clicks APPROVE → Mock SMS dispatched</span></div>
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">6</span><span>SMS log shows: plan_approved + evacuation_order per habitation</span></div>
        </div>
        <div className="mt-3 p-3 bg-white rounded border border-amber-200">
          <div className="flex items-center gap-2 text-amber-800"><AlertTriangle className="w-4 h-4" /><span className="font-medium">CRITICAL RULE</span></div>
          <p className="text-xs text-amber-700 mt-1">NO operational SMS may be dispatched before human authority approval. The approval button is the ONLY path to SMS dispatch.</p>
        </div>
      </Card>
    </div>
  );
}

function VersionCard({ version, isExpanded, onToggle, onApprove, approvalStatus, approving, approvalMessage }: {
  version: PlanVersion;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: (version: number) => void;
  approvalStatus: "PENDING" | "APPROVED";
  approving: boolean;
  approvalMessage: string;
}) {
  const statusConfig = (() => {
    switch (version.status) {
      case "active": return { badgeVariant: "success" as const, bg: "bg-green-50", border: "border-green-200", borderLeft: "border-l-4 border-green-500" };
      case "invalid": return { badgeVariant: "danger" as const, bg: "bg-red-50", border: "border-red-200", borderLeft: "border-l-4 border-red-500" };
      case "superseded": return { badgeVariant: "neutral" as const, bg: "bg-slate-50", border: "border-slate-200", borderLeft: "" };
      default: return { badgeVariant: "neutral" as const, bg: "bg-slate-50", border: "border-slate-200", borderLeft: "" };
    }
  })();

  const statusLabel = version.status.charAt(0).toUpperCase() + version.status.slice(1);

  return (
    <Card variant="outlined" className={`overflow-hidden ${statusConfig.bg} ${statusConfig.border} ${statusConfig.borderLeft}`}>
      <button onClick={onToggle} className="w-full p-3 flex items-center gap-3 transition-colors">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-mono text-sm">v{version.version}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant={statusConfig.badgeVariant} size="sm" dot dotColor={version.status === "active" ? "bg-green-500" : version.status === "invalid" ? "bg-red-500" : "bg-slate-400"}>
                {statusLabel}
              </Badge>
              {version.invalidation_reason && <Badge variant="danger" size="sm">Invalidated</Badge>}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Assigned: {version.total_assigned_population?.toLocaleString() || 0}</span>
              <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Unmet: {version.total_unmet_population?.toLocaleString() || 0}</span>
              <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l4-4m-4 4l4 4m-6 11V7a2 2 0 012-2h6a2 2 0 012 2v11a2 2 0 01-2 2h-4m-4 0H9m4 0a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v3.5" /></svg> {new Date(version.created_at).toLocaleString()}</span>
            </div>
          </div>
          <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-3">
          {version.invalidation_reason && (
            <Card variant="outlined" className="p-3 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 text-red-700 mb-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg><span className="font-medium text-sm">Invalidation Reason</span></div>
              <p className="text-sm text-red-600">{version.invalidation_reason}</p>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Card variant="outlined" className="p-2 bg-white"><span className="text-slate-500">Affected Assignments</span><div className="font-mono text-slate-700">{version.affected_assignments?.length || 0}</div></Card>
            <Card variant="outlined" className="p-2 bg-white"><span className="text-slate-500">Affected Sites</span><div className="font-mono text-slate-700">{version.affected_sites?.length || 0}</div></Card>
            <Card variant="outlined" className="p-2 bg-white"><span className="text-slate-500">Affected Routes</span><div className="font-mono text-slate-700">{version.affected_routes?.length || 0}</div></Card>
            <Card variant="outlined" className="p-2 bg-white"><span className="text-slate-500">Optimization Status</span><div className="font-mono text-slate-700 capitalize">{version.optimization_status}</div></Card>
          </div>

          {version.affected_assignments && version.affected_assignments.length > 0 && (
            <Card variant="outlined" className="p-2 bg-white"><span className="text-xs text-slate-500">Affected Habitations:</span><div className="text-xs text-slate-700 font-mono mt-1">{version.affected_assignments.join(", ")}</div></Card>
          )}

          {version.affected_routes && version.affected_routes.length > 0 && (
            <Card variant="outlined" className="p-2 bg-white"><span className="text-xs text-slate-500">Affected Routes:</span><div className="text-xs text-slate-700 font-mono">{version.affected_routes.join(", ")}</div></Card>
          )}

          {version.affected_sites && version.affected_sites.length > 0 && (
            <Card variant="outlined" className="p-2 bg-white"><span className="text-xs text-slate-500">Affected Sites:</span><div className="text-xs text-slate-700 font-mono">{version.affected_sites.join(", ")}</div></Card>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            {approvalStatus === "APPROVED" && version.status === "active" && (
              <div className="flex-1 flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded text-xs font-medium"><span>✅</span><span>Plan v{version.version} approved, SMS dispatched</span></div>
            )}
            {(!approvalStatus || approvalStatus === "PENDING") && version.status === "active" && (
              <Button variant="primary" size="sm" className="flex-1" disabled={approving} onClick={() => onApprove(version.version)}>
                {approving ? "Approving..." : <> <span>📤</span> Approve & Dispatch SMS </>}
              </Button>
            )}
            <Button variant="danger" size="sm" className="flex-1" disabled={version.status !== "active"} onClick={() => { /* reject logic */ }}><span>❌</span> Reject</Button>
            <Button variant="secondary" size="sm" className="flex-1" disabled={version.status !== "active"} onClick={() => { /* reoptimize */ }}><span>🔄</span> Re-optimize</Button>
          </div>

          {approvalStatus === "APPROVED" && <div className="flex-1 flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded text-xs font-medium"><span>✅</span><span>Plan approved, SMS dispatched</span></div>}
        </div>
      )}
    </Card>
  );
}