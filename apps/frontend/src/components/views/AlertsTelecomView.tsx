'use client';

import { useSMSLog, useActivePlan, useApprovePlan, useEventLog } from '@/hooks/useApi';
import { AlertTriangle, AlertCircle, CheckCircle, Loader2, Bell, Send, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AlertsTelecomView() {
  const { data: smsLog } = useSMSLog();
  const { data: activePlan } = useActivePlan();
  const { data: eventLog } = useEventLog();
  const approveMutation = useApprovePlan();

  const [approvalStatus, setApprovalStatus] = useState<'PENDING' | 'APPROVED'>('PENDING');
  const [approving, setApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');

  const currentPlan = activePlan?.plan;

  useEffect(() => {
    if (currentPlan?.approval_status) {
      const status = String(currentPlan.approval_status).toUpperCase();
      setApprovalStatus(status === 'APPROVED' ? 'APPROVED' : 'PENDING');
    }
  }, [currentPlan]);

  const handleApprove = async () => {
    if (!currentPlan || approving) return;
    setApproving(true);
    setApprovalMessage('');

    try {
      const result = await approveMutation.mutateAsync({ plan_id: currentPlan.plan_id });
      if (result.success) {
        setApprovalStatus('APPROVED');
        setApprovalMessage('Plan approved. SMS notifications dispatched.');
      } else {
        setApprovalMessage(result.error ?? 'Approval failed');
      }
    } catch (error: any) {
      setApprovalMessage(error.message ?? 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Alerts & Telecom</h2>
        <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">Mock SMS</span>
      </div>

      {/* Current Plan Status */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" />
          Current Plan Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Plan Version</div>
            <div className="text-lg font-bold text-slate-900">v{currentPlan?.version ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Status</div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${currentPlan?.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium capitalize text-slate-900">{currentPlan?.status ?? 'none'}</span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Approval</div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${approvalStatus === 'APPROVED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-sm font-medium">{approvalStatus === 'APPROVED' ? 'Approved' : 'Pending'}</span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">SMS Notifications</div>
            <div className="text-lg font-bold text-slate-900">{smsLog?.entries?.filter((e: any) => e.plan_id === currentPlan?.plan_id).length ?? 0}</div>
          </div>
        </div>

        {/* Approval Action */}
        <div className="border-t border-slate-200 pt-4">
          <button
            onClick={handleApprove}
            disabled={!currentPlan || currentPlan?.status !== 'active' || approving || approvalStatus === 'APPROVED'}
            className={`w-full rounded-lg px-4 py-3 text-sm font-bold transition ${approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 cursor-default' : approving ? 'bg-slate-300 text-slate-600 cursor-wait' : 'btn-primary'}`}
          >
            {approvalStatus === 'APPROVED' ? (
              <>
                <CheckCircle className="w-5 h-5 inline mr-2" />
                Plan Approved & SMS Dispatched
              </>
            ) : approving ? (
              <>
                <Loader2 className="w-5 h-5 inline mr-2 animate-spin" />
                Approving & Dispatching SMS...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 inline mr-2" />
                Approve Plan & Dispatch SMS
              </>
            )}
          </button>

          {approvalMessage && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {approvalMessage}
            </div>
          )}

          <div className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            ⚠️ Operational rule: NO SMS before human authority approval. Approval triggers mock SMS dispatch to all assigned habitations.
          </div>
        </div>
      </div>

      {/* SMS Dispatch Log */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            SMS Dispatch Log ({smsLog?.total ?? 0})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Recipients</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Content Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {smsLog?.entries?.slice(0, 20).map((entry: any, idx: number) => (
                <tr key={entry.id ?? idx} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-600">{new Date(entry.created_at).toLocaleTimeString()}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${entry.message_type === 'plan_approved' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {entry.message_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600 font-mono text-xs">{entry.plan_id}</td>
                  <td className="px-3 py-2 text-slate-600">{entry.recipient_count}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${entry.status === 'delivered' ? 'bg-green-100 text-green-700' : entry.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{entry.message_content}</td>
                </tr>
              ))}
              {(!smsLog?.entries?.length) && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">No SMS dispatched yet. Approve a plan to trigger alerts.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Log */}
      <div className="bg-white rounded-lg border border-slate-200 mt-4">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Event Log</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {eventLog?.events?.slice(0, 10).map((event: any, idx: number) => (
            <div key={event.event_id ?? idx} className="p-3 hover:bg-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 capitalize">{String(event.event_type ?? 'event').replace(/_/g, ' ')}</div>
                <div className="text-xs text-slate-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Unknown time'}</div>
              </div>
              {event.metadata && (
                <div className="text-xs text-slate-500 max-w-xs truncate">
                  {JSON.stringify(event.metadata)}
                </div>
              )}
            </div>
          ))}
          {!eventLog?.events?.length && (
            <div className="p-4 text-center text-slate-500">No events recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}