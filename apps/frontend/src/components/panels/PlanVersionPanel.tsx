"use client";

import { usePlanVersions, useApprovePlan, PlanVersion } from "@/hooks/useApi";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Bell,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";

interface PlanVersionPanelProps {
  onApprove?: (version: number) => void;
  onReject?: (version: number) => void;
}

export function PlanVersionPanel({
  onApprove,
  onReject,
}: PlanVersionPanelProps) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<
    Record<number, { status: "pending" | "success" | "error"; message: string }>
  >({});
  const versions = usePlanVersions();
  const approveMutation = useApprovePlan();

  if (!versions || versions.length === 0) {
    return (
      <div className="card-elevated rounded-xl p-8 text-center animate-fade-in">
        <div className="text-5xl mb-3">📋</div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          No Plan Versions
        </h3>
        <p className="text-sm text-slate-500">
          Run optimization or trigger a disaster event to create a relocation
          plan.
        </p>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          bg: "bg-green-50",
          text: "text-green-700",
          border: "border-green-200",
          icon: CheckCircle,
          label: "ACTIVE",
        };
      case "invalid":
        return {
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
          icon: AlertCircle,
          label: "INVALID",
        };
      case "superseded":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: Clock,
          label: "SUPERSEDED",
        };
      default:
        return {
          bg: "bg-slate-50",
          text: "text-slate-700",
          border: "border-slate-200",
          icon: Clock,
          label: status.toUpperCase(),
        };
    }
  };

  return (
    <div className="card-elevated rounded-xl p-5 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Plan Versions ({versions.length})
        </h3>
        <span className="text-xs text-slate-500">Latest first</span>
      </div>

      <div className="space-y-3">
        {versions.map((version: any) => (
          <VersionCard
            key={version.version}
            version={version}
            isExpanded={expandedVersion === version.version}
            onToggle={() =>
              setExpandedVersion(
                expandedVersion === version.version ? null : version.version,
              )
            }
            onApprove={onApprove}
            onReject={onReject}
            approveMutation={approveMutation}
            approvalStatus={approvalStatus}
            setApprovalStatus={setApprovalStatus}
            getStatusConfig={getStatusConfig}
          />
        ))}
      </div>
    </div>
  );
}

interface VersionCardProps {
  version: PlanVersion;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove?: (version: number) => void;
  onReject?: (version: number) => void;
  approveMutation: ReturnType<typeof useApprovePlan>;
  approvalStatus: Record<
    number,
    { status: "pending" | "success" | "error"; message: string }
  >;
  setApprovalStatus: React.Dispatch<
    React.SetStateAction<
      Record<
        number,
        { status: "pending" | "success" | "error"; message: string }
      >
    >
  >;
  getStatusConfig: (status: string) => {
    bg: string;
    text: string;
    border: string;
    icon: any;
    label: string;
  };
}

function VersionCard({
  version,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  approveMutation,
  approvalStatus,
  setApprovalStatus,
  getStatusConfig,
}: VersionCardProps) {
  const statusConfig = getStatusConfig(version.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`card rounded-xl overflow-hidden transition-all duration-200 ${version.status === "active" ? "ring-1 ring-green-300" : version.status === "invalid" ? "ring-1 ring-red-300" : ""}`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-4 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={`flex items-center justify-center w-10 h-10 rounded-lg font-mono font-bold text-sm ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
          >
            v{version.version}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
              >
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </span>
              {version.invalidation_reason && (
                <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                  Invalidated
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Assigned:{" "}
                <span className="font-mono text-slate-900">
                  {version.total_assigned_population?.toLocaleString() || 0}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Unmet:{" "}
                <span className="font-mono text-red-600">
                  {version.total_unmet_population?.toLocaleString() || 0}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-mono text-slate-600">
                  {new Date(version.created_at).toLocaleString()}
                </span>
              </span>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50 animate-slide-up space-y-4">
          {version.invalidation_reason && (
            <div className="card rounded-lg p-4 bg-red-50 border-red-200">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium text-sm">Invalidation Reason</span>
              </div>
              <p className="text-sm text-red-600">
                {version.invalidation_reason}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card bg-slate-50 rounded-lg p-3 text-center border-slate-200">
              <div className="text-xs text-slate-500">Affected Assignments</div>
              <div className="font-mono text-slate-900 text-lg">
                {version.affected_assignments?.length || 0}
              </div>
            </div>
            <div className="card bg-slate-50 rounded-lg p-3 text-center border-slate-200">
              <div className="text-xs text-slate-500">Affected Sites</div>
              <div className="font-mono text-slate-900 text-lg">
                {version.affected_sites?.length || 0}
              </div>
            </div>
            <div className="card bg-slate-50 rounded-lg p-3 text-center border-slate-200">
              <div className="text-xs text-slate-500">Affected Routes</div>
              <div className="font-mono text-slate-900 text-lg">
                {version.affected_routes?.length || 0}
              </div>
            </div>
            <div className="card bg-slate-50 rounded-lg p-3 text-center border-slate-200">
              <div className="text-xs text-slate-500">Optimization Status</div>
              <div className="font-mono text-slate-900 text-lg capitalize">
                {version.optimization_status}
              </div>
            </div>
          </div>

          {version.affected_assignments &&
            version.affected_assignments.length > 0 && (
              <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                <span className="text-xs text-slate-500">
                  Affected Habitations:
                </span>
                <div className="text-xs text-slate-600 font-mono mt-1">
                  {version.affected_assignments.join(", ")}
                </div>
              </div>
            )}

          {version.affected_routes && version.affected_routes.length > 0 && (
            <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
              <span className="text-xs text-slate-500">Affected Routes:</span>
              <div className="text-xs text-slate-600 font-mono mt-1">
                {version.affected_routes.join(", ")}
              </div>
            </div>
          )}

          {version.affected_sites && version.affected_sites.length > 0 && (
            <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
              <span className="text-xs text-slate-500">Affected Sites:</span>
              <div className="text-xs text-slate-600 font-mono mt-1">
                {version.affected_sites.join(", ")}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-200">
            {approvalStatus[version.version]?.status === "success" && (
              <div className="flex-1 flex items-center justify-center gap-2 text-green-700 bg-green-50 px-4 py-2.5 rounded-lg text-xs font-medium border border-green-200">
                <Bell className="w-4 h-4" />
                <span>
                  SMS dispatched: {approvalStatus[version.version].message}
                </span>
              </div>
            )}
            {approvalStatus[version.version]?.status === "error" && (
              <div className="flex-1 flex items-center justify-center gap-2 text-red-700 bg-red-50 px-4 py-2.5 rounded-lg text-xs font-medium border border-red-200">
                <AlertCircle className="w-4 h-4" />
                <span>{approvalStatus[version.version].message}</span>
              </div>
            )}
            {(!approvalStatus[version.version] ||
              approvalStatus[version.version].status === "pending") && (
              <>
                <button
                  onClick={async () => {
                    setApprovalStatus((prev) => ({
                      ...prev,
                      [version.version]: {
                        status: "pending",
                        message: "Dispatching SMS...",
                      },
                    }));
                    try {
                      const result = await approveMutation.mutateAsync({
                        plan_id: version.plan_id,
                      });
                      if (result.success) {
                        setApprovalStatus((prev) => ({
                          ...prev,
                          [version.version]: {
                            status: "success",
                            message: `Plan v${version.version} approved, ${result.evacuation_orders_sent} evacuation orders sent`,
                          },
                        }));
                        onApprove?.(version.version);
                      } else {
                        setApprovalStatus((prev) => ({
                          ...prev,
                          [version.version]: {
                            status: "error",
                            message: result.error || "Approval failed",
                          },
                        }));
                      }
                    } catch (e: any) {
                      setApprovalStatus((prev) => ({
                        ...prev,
                        [version.version]: {
                          status: "error",
                          message: e.message || "Approval failed",
                        },
                      }));
                    }
                  }}
                  disabled={
                    version.status !== "active" || approveMutation.isPending
                  }
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 btn-primary text-xs font-medium"
                >
                  {approveMutation.isPending ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Dispatching SMS...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Approve & Dispatch SMS
                    </>
                  )}
                </button>
                <button
                  onClick={() => onReject?.(version.version)}
                  disabled={version.status !== "active"}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-red-600 bg-red-50 text-xs font-medium rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Plan
                </button>
                <button
                  onClick={() => onApprove?.(version.version)}
                  disabled={version.status !== "active"}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-purple-600 bg-purple-50 text-xs font-medium rounded-lg hover:bg-purple-100 border border-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Re-optimize
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
