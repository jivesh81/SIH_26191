"use client";

import { useSMSLog, useActivePlan, useApprovePlan, useEventLog } from "@/hooks/useApi";
import { AlertTriangle, AlertCircle, CheckCircle, Loader2, Bell, Send, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, Badge, Button, DataTable } from "@/components/ui";

export function AlertsTelecomView() {
  const { data: smsLog } = useSMSLog();
  const { data: activePlan } = useActivePlan();
  const { data: eventLog } = useEventLog();
  const approveMutation = useApprovePlan();

  const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED">("PENDING");
  const [approving, setApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");

  const currentPlan = activePlan?.plan;

  useEffect(() => {
    if (currentPlan?.approval_status) {
      const status = String(currentPlan.approval_status).toUpperCase();
      setApprovalStatus(status === "APPROVED" ? "APPROVED" : "PENDING");
    }
  }, [currentPlan]);

  const handleApprove = async () => {
    if (!currentPlan || approving) return;
    setApproving(true);
    setApprovalMessage("");

    try {
      const result = await approveMutation.mutateAsync({ plan_id: currentPlan.plan_id });
      if (result.success) {
        setApprovalStatus("APPROVED");
        setApprovalMessage("Plan approved. SMS notifications dispatched.");
      } else {
        setApprovalMessage(result.error ?? "Approval failed");
      }
    } catch (error: any) {
      setApprovalMessage(error.message ?? "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  const smsColumns = [
    { key: "time", header: "Time", accessor: (e: any) => new Date(e.created_at).toLocaleTimeString(), width: "100px", monospace: true },
    { key: "type", header: "Type", accessor: (e: any) => <Badge variant={e.message_type === "plan_approved" ? "info" : "warning"} size="sm">{e.message_type.replace(/_/g, " ")}</Badge>, align: "center" as const, width: "140px" },
    { key: "plan", header: "Plan", accessor: (e: any) => <span className="font-mono text-xs">{e.plan_id}</span>, align: "center" as const, width: "100px" },
    { key: "recipients", header: "Recipients", accessor: (e: any) => e.recipient_count, align: "right" as const, width: "100px", monospace: true },
    { key: "status", header: "Status", accessor: (e: any) => { const variant = e.status === "delivered" ? "success" : e.status === "sent" ? "info" : "warning"; const dotColor = e.status === "delivered" ? "bg-green-500" : e.status === "sent" ? "bg-blue-500" : "bg-amber-500"; return <Badge variant={variant} size="sm" dot dotColor={dotColor}>{e.status}</Badge>; }, align: "center" as const, width: "120px" },
    { key: "content", header: "Content Preview", accessor: (e: any) => <span className="text-slate-600 max-w-xs truncate block">{e.message_content}</span> },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Alerts & Telecom</h2>
        <Badge variant="warning" size="sm">Mock SMS</Badge>
      </div>

      <Card className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Shield className="w-4 h-4 text-slate-500" />Current Plan Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card variant="outlined" className="p-3"><div className="text-xs text-slate-500">Plan Version</div><div className="text-lg font-bold text-slate-900">v{currentPlan?.version ?? "—"}</div></Card>
<Card variant="outlined" className="p-3"><div className="text-xs text-slate-500">Status</div><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${currentPlan?.status === "active" ? "bg-green-500" : "bg-red-500"}`} /><span className="text-sm font-medium capitalize text-slate-900">{currentPlan?.status ?? "none"}</span></div></Card>
<Card variant="outlined" className="p-3"><div className="text-xs text-slate-500">Approval</div><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${approvalStatus === "APPROVED" ? "bg-green-500" : "bg-amber-500"}`} /><span className="text-sm font-medium">{approvalStatus === "APPROVED" ? "Approved" : "Pending"}</span></div></Card>
          <Card variant="outlined" className="p-3"><div className="text-xs text-slate-500">SMS Notifications</div><div className="text-lg font-bold text-slate-900">{smsLog?.entries?.filter((e: any) => e.plan_id === currentPlan?.plan_id).length ?? 0}</div></Card>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <Button
            variant={approvalStatus === "APPROVED" ? "secondary" : "primary"}
            disabled={!currentPlan || currentPlan?.status !== "active" || approving || approvalStatus === "APPROVED"}
            fullWidth
            onClick={handleApprove}
            leftIcon={approvalStatus === "APPROVED" ? <CheckCircle className="w-5 h-5" /> : approving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          >
            {approvalStatus === "APPROVED" ? "Plan Approved & SMS Dispatched" : approving ? "Approving & Dispatching SMS..." : "Approve Plan & Dispatch SMS"}
          </Button>

          {approvalMessage && <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${approvalStatus === "APPROVED" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{approvalMessage}</div>}

          <div className="text-[10px] text-slate-400 mt-2 leading-relaxed">⚠️ Operational rule: NO SMS before human authority approval. Approval triggers mock SMS dispatch to all assigned habitations.</div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50"><h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Bell className="w-4 h-4 text-slate-500" />SMS Dispatch Log ({smsLog?.total ?? 0})</h3></div>
        <DataTable columns={smsColumns} data={smsLog?.entries?.slice(0, 20) ?? []} keyAccessor={(e: any) => e.id} emptyMessage="No SMS dispatched yet. Approve a plan to trigger alerts." />
      </Card>

      <Card className="mt-4">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50"><h3 className="text-sm font-semibold text-slate-900">Event Log</h3></div>
        <div className="divide-y divide-slate-200">
          {eventLog?.events?.slice(0, 10).map((event: any, idx: number) => (
            <div key={event.event_id ?? idx} className="p-3 hover:bg-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-blue-600" /></div>
              <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-900 capitalize">{String(event.event_type ?? "event").replace(/_/g, " ")}</div><div className="text-xs text-slate-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : "Unknown time"}</div></div>
              {event.metadata && <div className="text-xs text-slate-500 max-w-xs truncate">{JSON.stringify(event.metadata)}</div>}
            </div>
          ))}
          {!eventLog?.events?.length && <div className="p-4 text-center text-slate-500">No events recorded yet.</div>}
        </div>
      </Card>
    </div>
  );
}