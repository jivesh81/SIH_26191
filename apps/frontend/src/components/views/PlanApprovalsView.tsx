"use client";

import { useActivePlan, useApprovePlan, useEventLog } from "@/hooks/useApi";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronUp,
  Shield,
  Send,
} from "lucide-react";
import { useState, useEffect } from "react";

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
  const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED">(
    "PENDING",
  );
  const [approving, setApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");

  const versions = [
    {
      version: activePlan?.plan?.version ?? 1,
      plan_id: activePlan?.plan?.plan_id ?? "current",
      status: activePlan?.plan?.status ?? "active",
      total_assigned_population:
        activePlan?.plan?.total_assigned_population ?? 0,
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
      const result = await approveMutation.mutateAsync({
        plan_id: plan.plan_id,
      });
      if (result.success) {
        setApprovalStatus("APPROVED");
        setApprovalMessage(
          `Plan v${version} approved. ${result.evacuation_orders_sent} evacuation orders sent.`,
        );
      } else {
        setApprovalMessage(result.error ?? "Approval failed");
      }
    } catch (error: any) {
      setApprovalMessage(error.message ?? "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "invalid":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "superseded":
        return <Clock className="w-4 h-4 text-slate-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "invalid":
        return "bg-red-100 text-red-700";
      case "superseded":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-500" />
          Plan Approvals
        </h2>
        <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
          Mock SMS
        </span>
      </div>

      <div className="space-y-3">
        {versions.map((version: any, idx: number) => (
          <VersionCard
            key={version.version}
            version={version}
            isExpanded={expandedVersion === version.version}
            onToggle={() =>
              setExpandedVersion(
                expandedVersion === version.version ? null : version.version,
              )
            }
            onApprove={handleApprove}
            approvalStatus={approvalStatus}
            approving={approving}
            approvalMessage={approvalMessage}
            setApprovalStatus={setApprovalStatus}
            setApproving={setApproving}
            setApprovalMessage={setApprovalMessage}
          />
        ))}
      </div>

      {/* Approval Workflow Explanation */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-amber-800 mb-3">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">Approval Workflow</span>
        </div>
        <div className="space-y-2 text-sm text-amber-700">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-xs font-bold">
              1
            </span>
            <span>Disaster event occurs or risk threshold crossed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-xs font-bold">
              2
            </span>
            <span>System re-optimizes and generates new plan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-xs font-bold">
              3
            </span>
            <span>
              New plan marked <strong>PENDING APPROVAL</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-xs font-bold">
              4
            </span>
            <span>Human authority reviews assignments, capacity & routes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 text-xs font-bold">
              5
            </span>
            <span className="text-emerald-800 font-semibold">
              Authority clicks APPROVE → Mock SMS dispatched
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
              6
            </span>
            <span>
              SMS log shows: plan_approved + evacuation_order per habitation
            </span>
          </div>
        </div>
        <div className="mt-3 p-3 bg-white rounded border border-amber-200">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">CRITICAL RULE</span>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            NO operational SMS may be dispatched before human authority
            approval. The approval button is the ONLY path to SMS dispatch.
          </p>
        </div>
      </div>
    </div>
  );
}

function VersionCard({
  version,
  isExpanded,
  onToggle,
  onApprove,
  approvalStatus,
  approving,
  approvalMessage,
  setApprovalStatus,
  setApproving,
  setApprovalMessage,
}: {
  version: {
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
  };
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: (version: number) => void;
  approvalStatus: "PENDING" | "APPROVED";
  approving: boolean;
  approvalMessage: string;
  setApprovalStatus: (status: "PENDING" | "APPROVED") => void;
  setApproving: (approving: boolean) => void;
  setApprovalMessage: (message: string) => void;
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "invalid":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "superseded":
        return <Clock className="w-4 h-4 text-slate-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "invalid":
        return "bg-red-100 text-red-700";
      case "superseded":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className={`w-full p-3 flex items-center gap-3 transition-colors ${version.status === "active" ? "bg-green-50 border-l-4 border-green-500" : version.status === "invalid" ? "bg-red-50 border-l-4 border-red-500" : "hover:bg-slate-50"}`}
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-mono text-sm">
            v{version.version}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${version.status === "active" ? "bg-green-100 text-green-700" : version.status === "invalid" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}
              >
                {getStatusIcon(version.status)}
                {version.status.charAt(0).toUpperCase() +
                  version.status.slice(1)}
              </span>
              {version.invalidation_reason && (
                <span className="text-xs text-red-600 px-2 py-0.5 bg-red-50 rounded">
                  Invalidated
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1">
                <span role="img" aria-label="clock">
                  🕐
                </span>{" "}
                Assigned:{" "}
                {version.total_assigned_population?.toLocaleString() || 0}
              </span>
              <span className="flex items-center gap-1">
                <span role="img" aria-label="warning">
                  ⚠️
                </span>{" "}
                Unmet: {version.total_unmet_population?.toLocaleString() || 0}
              </span>
              <span className="flex items-center gap-1">
                <span role="img" aria-label="calendar">
                  📅
                </span>{" "}
                {new Date(version.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <span role="img" aria-label="chevron">
            {isExpanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-3">
          {version.invalidation_reason && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <span role="img" aria-label="alert">
                  ⚠️
                </span>
                <span className="font-medium text-sm">Invalidation Reason</span>
              </div>
              <p className="text-sm text-red-600">
                {version.invalidation_reason}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white rounded p-2">
              <span className="text-slate-500">Affected Assignments</span>
              <div className="font-mono text-slate-700">
                {version.affected_assignments?.length || 0}
              </div>
            </div>
            <div className="bg-white rounded p-2">
              <span className="text-slate-500">Affected Sites</span>
              <div className="font-mono text-slate-700">
                {version.affected_sites?.length || 0}
              </div>
            </div>
            <div className="bg-white rounded p-2">
              <span className="text-slate-500">Affected Routes</span>
              <div className="font-mono text-slate-700">
                {version.affected_routes?.length || 0}
              </div>
            </div>
            <div className="bg-white rounded p-2">
              <span className="text-slate-500">Optimization Status</span>
              <div className="font-mono text-slate-700 capitalize">
                {version.optimization_status}
              </div>
            </div>
          </div>

          {version.affected_assignments &&
            version.affected_assignments.length > 0 && (
              <div className="bg-white rounded p-2">
                <span className="text-xs text-slate-500">
                  Affected Habitations:
                </span>
                <div className="text-xs text-slate-700 font-mono mt-1">
                  {version.affected_assignments.join(", ")}
                </div>
              </div>
            )}

          {version.affected_routes && version.affected_routes.length > 0 && (
            <div className="bg-white rounded p-2">
              <span className="text-xs text-slate-500">Affected Routes:</span>
              <div className="text-xs text-slate-700 font-mono">
                {version.affected_routes.join(", ")}
              </div>
            </div>
          )}

          {version.affected_sites && version.affected_sites.length > 0 && (
            <div className="bg-white rounded p-2">
              <span className="text-xs text-slate-500">Affected Sites:</span>
              <div className="text-xs text-slate-700 font-mono">
                {version.affected_sites.join(", ")}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            {approvalStatus === "APPROVED" && version.status === "active" && (
              <div className="flex-1 flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded text-xs font-medium">
                <span role="img" aria-label="check">
                  ✅
                </span>
                <span>Plan v{version.version} approved, SMS dispatched</span>
              </div>
            )}
            {(!approvalStatus || approvalStatus === "PENDING") &&
              version.status === "active" && (
                <button
                  onClick={() => onApprove(version.version)}
                  disabled={approving}
                  className="flex-1 py-1.5 px-3 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {approving ? (
                    <span>Approving...</span>
                  ) : (
                    <>
                      <span role="img" aria-label="send">
                        📤
                      </span>
                      Approve & Dispatch SMS
                    </>
                  )}
                </button>
              )}
            <button
              onClick={() => {
                /* reject logic */
              }}
              disabled={version.status !== "active"}
              className="flex-1 py-1.5 px-3 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span role="img" aria-label="reject">
                ❌
              </span>
              Reject
            </button>
            <button
              onClick={() => {
                /* reoptimize */
              }}
              disabled={version.status !== "active"}
              className="flex-1 py-1.5 px-3 bg-slate-600 text-white text-xs font-medium rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span role="img" aria-label="rotate">
                🔄
              </span>
              Re-optimize
            </button>
          </div>

          {approvalStatus === "APPROVED" && (
            <div className="flex-1 flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded text-xs font-medium">
              <span role="img" aria-label="check">
                ✅
              </span>
              <span>Plan approved, SMS dispatched</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
