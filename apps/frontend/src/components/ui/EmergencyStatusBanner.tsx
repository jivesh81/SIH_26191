"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui";

interface ActiveEvent {
  id: string;
  event_type: string;
  status: string;
  severity: string;
  started_at: string;
  description?: string;
  affected_area?: string;
}

async function fetchActiveEvents(): Promise<{ active_events: ActiveEvent[] }> {
  return { active_events: [] };
}

export function EmergencyStatusBanner() {
  const { data, isLoading } = useQuery({
    queryKey: ["active-events"],
    queryFn: fetchActiveEvents,
    staleTime: 30000,
  });

  const activeEvent = data?.active_events?.[0];

  if (isLoading) {
    return (
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-full px-4 md:px-6 py-2">
          <div className="h-6 bg-slate-200 animate-pulse rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="border-b border-slate-200 bg-green-50">
        <div className="max-w-full px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">NO ACTIVE EMERGENCY</p>
                <p className="text-xs text-green-700">System ready for operational deployment</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-700">
              <Badge variant="success" size="sm" dot dotColor="bg-green-500">
                System Operational
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string, severity: string) => {
    const baseConfig = {
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-700",
      titleColor: "text-amber-800",
      descColor: "text-amber-700",
      badgeVariant: "warning" as const,
      badgeDot: "bg-amber-500",
    };

    if (status === "active" && severity === "critical") {
      return {
        ...baseConfig,
        bg: "bg-red-50",
        border: "border-red-200",
        iconBg: "bg-red-100",
        iconColor: "text-red-700",
        titleColor: "text-red-800",
        descColor: "text-red-700",
        badgeVariant: "danger" as const,
        badgeDot: "bg-red-500",
      };
    }

    if (status === "simulating") {
      return {
        ...baseConfig,
        bg: "bg-blue-50",
        border: "border-blue-200",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-700",
        titleColor: "text-blue-800",
        descColor: "text-blue-700",
        badgeVariant: "info" as const,
        badgeDot: "bg-blue-500",
      };
    }

    if (status === "awaiting_approval") {
      return {
        ...baseConfig,
        bg: "bg-purple-50",
        border: "border-purple-200",
        iconBg: "bg-purple-100",
        iconColor: "text-purple-700",
        titleColor: "text-purple-800",
        descColor: "text-purple-700",
        badgeVariant: "info" as const,
        badgeDot: "bg-purple-500",
      };
    }

    if (status === "approved") {
      return {
        ...baseConfig,
        bg: "bg-green-50",
        border: "border-green-200",
        iconBg: "bg-green-100",
        iconColor: "text-green-700",
        titleColor: "text-green-800",
        descColor: "text-green-700",
        badgeVariant: "success" as const,
        badgeDot: "bg-green-500",
      };
    }

    if (status === "superseded" || status === "reoptimized") {
      return {
        ...baseConfig,
        bg: "bg-cyan-50",
        border: "border-cyan-200",
        iconBg: "bg-cyan-100",
        iconColor: "text-cyan-700",
        titleColor: "text-cyan-800",
        descColor: "text-cyan-700",
        badgeVariant: "info" as const,
        badgeDot: "bg-cyan-500",
      };
    }

    return baseConfig;
  };

  const config = getStatusConfig(activeEvent.status, activeEvent.severity);

  const formatEventType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div className={`border-b ${config.border} ${config.bg}`}>
      <div className="max-w-full px-4 md:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.iconBg}`}>
              <svg
                className={`w-5 h-5 ${config.iconColor}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                {activeEvent.severity === "critical" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                )}
              </svg>
            </div>
            <div>
              <p className={`text-sm font-semibold ${config.titleColor}`}>
                ACTIVE EMERGENCY: {formatEventType(activeEvent.event_type)}
              </p>
              <p className={`text-xs ${config.descColor}`}>
                {activeEvent.description || "Emergency event in progress"}
                {activeEvent.affected_area && ` • Affected: ${activeEvent.affected_area}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={config.badgeVariant} size="sm" dot dotColor={config.badgeDot}>
              {formatStatus(activeEvent.status)}
              {activeEvent.severity === "critical" && (
                <>
                  <span className="text-[10px] font-bold">•</span>
                  <span className="text-[10px] font-bold uppercase">CRITICAL</span>
                </>
              )}
            </Badge>

            <span className="text-xs text-slate-500 hidden sm:block">
              Started: {new Date(activeEvent.started_at).toLocaleTimeString()}
            </span>

            <span className="text-xs text-slate-500 font-mono">
              ID: {activeEvent.id.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}