'use client';

import { useEventLog } from '@/hooks/useApi';
import { useActivePlan } from '@/hooks/useApi';
import { useSMSLog } from '@/hooks/useApi';
import { useState, useMemo } from 'react';

export function AuditActivityView() {
  const { data: eventLog, isLoading: eventLoading } = useEventLog();
  const { data: activePlan } = useActivePlan();
  const { data: smsLog, isLoading: smsLoading } = useSMSLog();
  const [activeTab, setActiveTab] = useState<'events' | 'plans' | 'sms'>('events');

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

  const filteredEvents = useMemo(() => {
    return events.slice(0, 50);
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="panel panel-elevated rounded-xl p-2 flex gap-2" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'events'}
          onClick={() => setActiveTab('events')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'events'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-navy-400 hover:text-white hover:bg-navy-800/50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Events ({events.length})
          </span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'plans'}
          onClick={() => setActiveTab('plans')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'plans'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-navy-400 hover:text-white hover:bg-navy-800/50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Plan Versions ({planVersions.length})
          </span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'sms'}
          onClick={() => setActiveTab('sms')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'sms'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-navy-400 hover:text-white hover:bg-navy-800/50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h4M8 12a2 2 0 100-4 2 2 0 000 4zm-6 0a2 2 0 100-4 2 2 0 000 4zm6 6h4M8 18a2 2 0 100-4 2 2 0 000 4zm-6 0a2 2 0 100-4 2 2 0 000 4zm10-12h2a2 2 0 012 2v10a2 2 0 01-2 2h-4a2 2 0 01-2-2v-3" />
            </svg>
            SMS Log ({smsEntries.length})
          </span>
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="panel panel-elevated rounded-xl overflow-hidden" role="tabpanel">
          {eventLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent mx-auto mb-4" />
              <p className="text-navy-400">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-navy-400">No disaster events simulated yet.</p>
              <p className="text-caption text-navy-500 mt-1">Use Disaster Simulation to trigger events and see them here.</p>
            </div>
          ) : (
            <div className="divide-y divide-navy-700/50">
              {filteredEvents.map((event, idx) => (
                <div
                  key={event.event_id ?? idx}
                  className="p-4 hover:bg-navy-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                        event.event_type === 'bridge_collapse' ? 'bg-red-500/20' :
                        event.event_type === 'capacity_reduction' ? 'bg-orange-500/20' :
                        event.event_type === 'rainfall' ? 'bg-blue-500/20' :
                        'bg-purple-500/20'
                      }`}>
                        {event.event_type === 'bridge_collapse' && '🌉'}
                        {event.event_type === 'capacity_reduction' && '🏕️'}
                        {event.event_type === 'rainfall' && '🌧️'}
                        {event.event_type === 'combined' && '⚡'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white capitalize">{event.event_type?.replace('_', ' ')}</span>
                          {event.event_id && (
                            <span className="text-micro font-mono text-navy-400 bg-navy-800 px-2 py-0.5 rounded">
                              {event.event_id}
                            </span>
                          )}
                        </div>
                        <div className="text-caption text-navy-400 mt-1 flex items-center gap-4">
                          {event.timestamp && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          )}
                          {event.metadata?.bridge_id && (
                            <span className="flex items-center gap-1 text-amber-300">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              Bridge: {event.metadata.bridge_id}
                            </span>
                          )}
                          {event.metadata?.shelter_ids && (
                            <span className="flex items-center gap-1 text-orange-300">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                              </svg>
                              Shelters: {Array.isArray(event.metadata.shelter_ids) ? event.metadata.shelter_ids.join(', ') : event.metadata.shelter_ids}
                            </span>
                          )}
                          {event.metadata?.reduction_pct && (
                            <span className="flex items-center gap-1 text-red-300">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Reduction: {event.metadata.reduction_pct}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {event.result?.plan_invalidated ? (
                        <span className="status-badge status-badge-critical flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Plan Invalidated
                        </span>
                      ) : (
                        <span className="status-badge status-badge-pending">Processed</span>
                      )}
                      {event.result?.new_plan && (
                        <span className="status-badge status-badge-approved">v{event.result.new_plan.version}</span>
                      )}
                    </div>
                  </div>

                  {event.result?.message && (
                    <div className="mt-3 p-3 bg-navy-800/50 rounded-lg text-sm text-navy-300">
                      {event.result.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plan Versions Tab */}
      {activeTab === 'plans' && (
        <div className="panel panel-elevated rounded-xl overflow-hidden" role="tabpanel">
          {planVersions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-navy-400">No plan versions available.</p>
              <p className="text-caption text-navy-500 mt-1">Plan versions will appear after optimization runs.</p>
            </div>
          ) : (
            <div className="divide-y divide-navy-700/50">
              {planVersions.map((version, idx) => (
                <div
                  key={version.plan_id ?? version.version}
                  className="p-4 hover:bg-navy-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-navy-800 flex items-center justify-center text-xl font-mono font-bold text-cyan-300">
                        v{version.version}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">Plan Version {version.version}</span>
                          <span className={`status-badge ${version.status === 'active' ? 'status-badge-approved' : version.status === 'invalid' ? 'status-badge-critical' : 'status-badge-pending'}`}>
                            {version.status}
                          </span>
                        </div>
                        <div className="text-caption text-navy-400 mt-1 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(version.created_at).toLocaleString()}
                          </span>
                          {version.invalidated_at && (
                            <span className="flex items-center gap-1 text-red-300">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Invalidated: {new Date(version.invalidated_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-navy-300">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-mono tabular-nums">{version.total_assigned_population?.toLocaleString()}</span>
                        <span className="text-navy-500">assigned</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-mono tabular-nums">{version.total_unmet_population?.toLocaleString()}</span>
                        <span className="text-navy-500">unmet</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="font-mono tabular-nums">{version.optimization_status}</span>
                      </div>
                    </div>
                  </div>

                  {version.invalidation_reason && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-red-300 mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">Invalidation Reason:</span>
                      </div>
                      <p className="text-sm text-red-200">{version.invalidation_reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SMS Log Tab */}
      {activeTab === 'sms' && (
        <div className="panel panel-elevated rounded-xl overflow-hidden" role="tabpanel">
          {smsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent mx-auto mb-4" />
              <p className="text-navy-400">Loading SMS log...</p>
            </div>
          ) : smsEntries.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">📡</div>
              <p className="text-navy-400">No SMS messages dispatched yet.</p>
              <p className="text-caption text-navy-500 mt-1">SMS notifications are sent only after human authority approves a relocation plan.</p>
            </div>
          ) : (
            <div className="divide-y divide-navy-700/50">
              {smsEntries.slice(0, 50).map((entry, idx) => (
                <div
                  key={entry.id ?? idx}
                  className="p-4 hover:bg-navy-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        entry.status === 'delivered' ? 'bg-green-500/20' :
                        entry.status === 'sent' ? 'bg-blue-500/20' :
                        'bg-amber-500/20'
                      }`}>
                        <svg className={`w-5 h-5 ${entry.status === 'delivered' ? 'text-green-400' : entry.status === 'sent' ? 'text-blue-400' : 'text-amber-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h4M8 12a2 2 0 100-4 2 2 0 000 4zm-6 0a2 2 0 100-4 2 2 0 000 4zm6 6h4M8 18a2 2 0 100-4 2 2 0 000 4zm-6 0a2 2 0 100-4 2 2 0 000 4zm10-12h2a2 2 0 012 2v10a2 2 0 01-2 2h-4a2 2 0 01-2-2v-3" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white capitalize">{entry.message_type.replace('_', ' ')}</span>
                          <span className={`status-badge ${entry.status === 'delivered' ? 'status-badge-approved' : entry.status === 'sent' ? 'status-badge-active' : 'status-badge-pending'}`}>
                            {entry.status}
                          </span>
                        </div>
                        <div className="text-caption text-navy-400 mt-1 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                          {entry.sent_at && (
                            <span className="flex items-center gap-1 text-green-300">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Sent: {new Date(entry.sent_at).toLocaleTimeString()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {entry.recipient_count} recipients
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {entry.plan_version && (
                        <span className="text-micro font-mono text-navy-400 bg-navy-800 px-2 py-0.5 rounded">
                          Plan v{entry.plan_version}
                        </span>
                      )}
                    </div>
                  </div>

                  {entry.message_content && (
                    <details className="mt-3 group">
                      <summary className="cursor-pointer text-caption text-navy-400 hover:text-cyan-300 flex items-center gap-1">
                        <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        View message content
                      </summary>
                      <div className="mt-2 p-3 bg-navy-800/50 rounded-lg text-sm text-navy-200 font-mono whitespace-pre-wrap">
                        {entry.message_content}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}