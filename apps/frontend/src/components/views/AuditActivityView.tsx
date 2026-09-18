"use client";

import { useEventLog } from "@/hooks/useApi";
import { useActivePlan } from "@/hooks/useApi";
import { useSMSLog } from "@/hooks/useApi";
import { useState, useMemo } from "react";
import { Card, Badge, DataTable, Button } from "@/components/ui";

export function AuditActivityView() {
  const { data: eventLog, isLoading: eventLoading } = useEventLog();
  const { data: activePlan } = useActivePlan();
  const { data: smsLog, isLoading: smsLoading } = useSMSLog();
  const [activeTab, setActiveTab] = useState<"events" | "plans" | "sms">("events");

  const events = eventLog?.events ?? [];
  const plan = activePlan?.plan ?? activePlan;
  const planVersions: Array<{
    version: number;
    plan_id: string;
    status: string;
    total_assigned_population?: number;
    total_unmet_population?: number;
    optimization_status: string;
    created_at: string;
    invalidated_at?: string | null;
    invalidation_reason?: string | null;
    affected_assignments?: string[];
    affected_sites?: string[];
    affected_routes?: string[];
  }> = (activePlan as any)?.all_versions ?? [];
  const smsEntries = smsLog?.entries ?? [];

  const filteredEvents = useMemo(() => events.slice(0, 50), [events]);

  const eventColumns = [
    { key: "type", header: "Event", accessor: (e: any) => <span className="font-medium text-slate-900 capitalize">{String(e.event_type ?? "event").replace(/_/g, " ")}</span> },
    { key: "time", header: "Time", accessor: (e: any) => e.timestamp ? new Date(e.timestamp).toLocaleString() : "—", width: "180px", monospace: true },
    { key: "bridge", header: "Bridge", accessor: (e: any) => e.metadata?.bridge_id ?? "—", width: "160px" },
    { key: "shelters", header: "Shelters", accessor: (e: any) => Array.isArray(e.metadata?.shelter_ids) ? e.metadata.shelter_ids.join(", ") : e.metadata?.shelter_ids ?? "—" },
    { key: "reduction", header: "Reduction", accessor: (e: any) => e.metadata?.reduction_pct ? `${e.metadata.reduction_pct}%` : "—", width: "100px", align: "center" as const },
    { key: "result", header: "Result", accessor: (e: any) => e.result?.plan_invalidated ? <Badge variant="danger" size="sm">Plan Invalidated</Badge> : <Badge variant="success" size="sm">Processed</Badge>, align: "center" as const, width: "140px" },
    { key: "newPlan", header: "New Plan", accessor: (e: any) => e.result?.new_plan ? <Badge variant="info" size="sm">v{e.result.new_plan.version}</Badge> : <span className="text-slate-400">—</span>, align: "center" as const, width: "100px" },
  ];

  const planColumns = [
    { key: "version", header: "Version", accessor: (v: any) => <span className="font-mono font-bold text-blue-600">v{v.version}</span>, width: "100px", align: "center" as const },
    { key: "status", header: "Status", accessor: (v: any) => { const variant = v.status === "active" ? "success" : v.status === "invalid" ? "danger" : "neutral"; return <Badge variant={variant} size="sm" dot dotColor={v.status === "active" ? "bg-green-500" : v.status === "invalid" ? "bg-red-500" : "bg-slate-400"}> {v.status}</Badge>; }, align: "center" as const, width: "120px" },
    { key: "assigned", header: "Assigned", accessor: (v: any) => v.total_assigned_population?.toLocaleString() ?? 0, align: "right" as const, width: "120px", monospace: true },
    { key: "unmet", header: "Unmet", accessor: (v: any) => v.total_unmet_population?.toLocaleString() ?? 0, align: "right" as const, width: "120px", monospace: true },
    { key: "optStatus", header: "Opt. Status", accessor: (v: any) => v.optimization_status, align: "center" as const, width: "140px" },
    { key: "created", header: "Created", accessor: (v: any) => new Date(v.created_at).toLocaleString(), width: "180px", monospace: true },
    { key: "invalidated", header: "Invalidated", accessor: (v: any) => v.invalidated_at ? new Date(v.invalidated_at).toLocaleString() : "—", width: "180px", monospace: true },
  ];

  const smsColumns = [
    { key: "type", header: "Type", accessor: (e: any) => <Badge variant={e.message_type === "plan_approved" ? "info" : "warning"} size="sm">{e.message_type.replace(/_/g, " ")}</Badge>, align: "center" as const, width: "140px" },
    { key: "status", header: "Status", accessor: (e: any) => { const variant = e.status === "delivered" ? "success" : e.status === "sent" ? "info" : "warning"; return <Badge variant={variant} size="sm" dot dotColor={e.status === "delivered" ? "bg-green-500" : e.status === "sent" ? "bg-blue-500" : "bg-amber-500"}> {e.status}</Badge>; }, align: "center" as const, width: "120px" },
    { key: "time", header: "Time", accessor: (e: any) => new Date(e.created_at).toLocaleString(), width: "180px", monospace: true },
    { key: "sent", header: "Sent", accessor: (e: any) => e.sent_at ? new Date(e.sent_at).toLocaleTimeString() : "—", width: "120px", monospace: true },
    { key: "recipients", header: "Recipients", accessor: (e: any) => e.recipient_count, align: "right" as const, width: "120px", monospace: true },
    { key: "planVersion", header: "Plan", accessor: (e: any) => e.plan_version ? `v${e.plan_version}` : "—", align: "center" as const, width: "100px" },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-2 flex gap-2" role="tablist">
        <Button variant={activeTab === "events" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("events")} className="flex-1 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Events ({events.length})
        </Button>
        <Button variant={activeTab === "plans" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("plans")} className="flex-1 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Plan Versions ({planVersions.length})
        </Button>
        <Button variant={activeTab === "sms" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("sms")} className="flex-1 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h4M8 12a2 2 0 100-4 2 2 0 000 4zm-6 0a2 2 0 100-4 2 2 0 000 4zm6 6h4M8 18a2 2 0 100-4 2 2 0 000 4zm-6 0a2 2 0 100-4 2 2 0 000 4zm10-12h2a2 2 0 012 2v10a2 2 0 01-2 2h-4a2 2 0 01-2-2v-3" /></svg>
          SMS Log ({smsEntries.length})
        </Button>
      </div>

      {activeTab === "events" && (
        <Card className="overflow-hidden">
          {eventLoading ? (
            <div className="p-8 text-center"><div className="animate-pulse w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-4" /><p className="text-slate-500">Loading events...</p></div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center"><div className="text-4xl mb-3">📋</div><p className="text-slate-500">No disaster events simulated yet.</p><p className="text-xs text-slate-400 mt-1">Use Disaster Simulation to trigger events and see them here.</p></div>
          ) : (
            <DataTable columns={eventColumns} data={filteredEvents} keyAccessor={(e: any) => e.event_id} emptyMessage="No events recorded." />
          )}
        </Card>
      )}

      {activeTab === "plans" && (
        <Card className="overflow-hidden">
          {planVersions.length === 0 ? (
            <div className="p-8 text-center"><div className="text-4xl mb-3">📋</div><p className="text-slate-500">No plan versions available.</p><p className="text-xs text-slate-400 mt-1">Plan versions will appear after optimization runs.</p></div>
          ) : (
            <DataTable columns={planColumns} data={planVersions} keyAccessor={(v: any) => v.plan_id} emptyMessage="No plan versions available." />
          )}
        </Card>
      )}

      {activeTab === "sms" && (
        <Card className="overflow-hidden">
          {smsLoading ? (
            <div className="p-8 text-center"><div className="animate-pulse w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-4" /><p className="text-slate-500">Loading SMS log...</p></div>
          ) : smsEntries.length === 0 ? (
            <div className="p-8 text-center"><div className="text-4xl mb-3">📡</div><p className="text-slate-500">No SMS messages dispatched yet.</p><p className="text-xs text-slate-400 mt-1">SMS notifications are sent only after human authority approves a relocation plan.</p></div>
          ) : (
            <DataTable columns={smsColumns} data={smsEntries.slice(0, 50)} keyAccessor={(e: any) => e.id} emptyMessage="No SMS messages dispatched yet." />
          )}
        </Card>
      )}
    </div>
  );
}