'use client';

import { useState } from 'react';
import { useTriggerEventMutation, useEventLog, useSMSLog } from '@/hooks/useApi';
import { AlertTriangle, AlertCircle, CheckCircle, Loader2, Zap } from 'lucide-react';

type EventType = 'bridge_collapse' | 'capacity_reduction' | 'rainfall' | 'combined';

interface EventControlsProps {
  onEventTriggered?: (result: any) => void;
}

function playEmergencyBeeps() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API is not available.');
      return;
    }
    const audioContext = new AudioContextClass();
    const startBeepSequence = () => {
      const startTime = audioContext.currentTime + 0.05;
      for (let i = 0; i < 10; i += 1) {
        const beepStart = startTime + i * 0.22;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(950, beepStart);
        gain.gain.setValueAtTime(0.0001, beepStart);
        gain.gain.exponentialRampToValueAtTime(0.28, beepStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, beepStart + 0.13);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(beepStart);
        oscillator.stop(beepStart + 0.14);
      }
      window.setTimeout(() => { audioContext.close().catch(() => { }); }, 2600);
    };
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(startBeepSequence).catch((error: any) => { console.warn('Could not resume audio:', error); });
    } else {
      startBeepSequence();
    }
  } catch (error) { console.warn('Emergency beep failed:', error); }
}

export function EventControls({ onEventTriggered }: EventControlsProps) {
  const [eventType, setEventType] = useState<EventType>('bridge_collapse');
  const [bridgeId, setBridgeId] = useState('bridge_chaulkhowa');
  const [shelterIds, setShelterIds] = useState<string[]>(['shelter_rc_barpeta']);
  const [reductionPct, setReductionPct] = useState(50);
  const [rainfallIntensity, setRainfallIntensity] = useState(1.0);
  const [lastResult, setLastResult] = useState<any>(null);

  const triggerEvent = useTriggerEventMutation();
  const { data: eventLog } = useEventLog();
  const { data: smsLog } = useSMSLog();

  const availableBridges = [
    { id: 'bridge_chaulkhowa', name: 'Chaulkhowa Bridge (SH-15)', routes: ['route_howly_1', 'route_bajali_1'], targetSite: 'SITE_001' },
    { id: 'bridge_beki', name: 'Beki River Bridge (NH-31)', routes: ['route_barpeta_1'], targetSite: 'SITE_001' },
    { id: 'bridge_kaldia', name: 'Kaldia River Bridge', routes: ['route_mandia_2', 'route_goberadhana_1'], targetSite: 'SITE_004' },
    { id: 'bridge_manas', name: 'Manas River Bridge', routes: ['route_sarbhog_1'], targetSite: 'SITE_002' },
  ];

  const availableShelters = [
    { id: 'shelter_rc_barpeta', name: 'Barpeta Relief Camp', site: 'SITE_001' },
    { id: 'shelter_rc_howly', name: 'Howly Relief Camp', site: 'SITE_002' },
    { id: 'shelter_rc_mandia', name: 'Mandia Relief Camp', site: 'SITE_004' },
    { id: 'shelter_rc_chenga', name: 'Chenga Relief Camp', site: 'SITE_004' },
    { id: 'shelter_rc_bajali', name: 'Bajali Relief Camp', site: 'SITE_003' },
    { id: 'shelter_rc_rupsi', name: 'Rupsi Cyclone Shelter', site: 'SITE_006' },
  ];

  const selectedBridge = availableBridges.find((bridge) => bridge.id === bridgeId);

  const handleTrigger = async () => {
    playEmergencyBeeps();

    const BARPETA_BBOX = { min_lng: 90.5, min_lat: 26.0, max_lng: 91.5, max_lat: 27.0 };

    let event: {
      event_type: 'bridge_collapse' | 'capacity_reduction' | 'rainfall' | 'combined';
      intensity: number;
      affected_area: { min_lng: number; min_lat: number; max_lng: number; max_lat: number };
      duration_hours: number;
      metadata: Record<string, any>;
    };

    if (eventType === 'bridge_collapse') {
      event = { event_type: 'bridge_collapse', intensity: 1.0, affected_area: BARPETA_BBOX, duration_hours: 6, metadata: { bridge_id: bridgeId } };
    } else if (eventType === 'capacity_reduction') {
      event = { event_type: 'capacity_reduction', intensity: reductionPct / 100, affected_area: BARPETA_BBOX, duration_hours: 6, metadata: { shelter_ids: shelterIds, reduction_pct: reductionPct } };
    } else if (eventType === 'rainfall') {
      event = { event_type: 'rainfall', intensity: rainfallIntensity, affected_area: BARPETA_BBOX, duration_hours: 24, metadata: { rainfall_mm_per_hour: Math.round(rainfallIntensity * 50) } };
    } else {
      event = { event_type: 'combined', intensity: 1.0, affected_area: BARPETA_BBOX, duration_hours: 12, metadata: { bridge_id: bridgeId, shelter_ids: shelterIds, reduction_pct: reductionPct, rainfall_mm_per_hour: 50 } };
    }

    try {
      const result = await triggerEvent.mutateAsync(event as any);
      setLastResult(result);
      onEventTriggered?.(result);
    } catch (error) {
      console.error('Failed to trigger event:', error);
      setLastResult({ plan_invalidated: false, error: error instanceof Error ? error.message : 'Failed to simulate event' });
    }
  };

  const isInvalidated = Boolean(lastResult?.plan_invalidated);

  const getEventTypeStyle = (type: EventType) => {
    const styles: Record<EventType, { bg: string; border: string; icon: string }> = {
      bridge_collapse: { bg: 'bg-red-50', border: 'border-red-200', icon: '🌉' },
      capacity_reduction: { bg: 'bg-orange-50', border: 'border-orange-200', icon: '🏕️' },
      rainfall: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '🌧️' },
      combined: { bg: 'bg-purple-50', border: 'border-purple-200', icon: '⚡' },
    };
    return styles[type];
  };

  return (
    <div className="card-elevated rounded-xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Disaster Simulation
            </h3>
            <p className="text-xs text-slate-500 mt-1">Simulate a disruption and trigger automatic re-planning with full consequence chain.</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold whitespace-nowrap border border-red-200">LIVE DEMO</span>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 space-y-6">
        {/* Event Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Select disaster event type</label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(['bridge_collapse', 'capacity_reduction', 'rainfall', 'combined'] as EventType[]).map((type) => {
              const style = getEventTypeStyle(type);
              const isSelected = eventType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEventType(type)}
                  className={`card rounded-xl p-4 text-left transition-all duration-200 relative overflow-hidden group ${isSelected ? `ring-2 ${style.border} ${style.bg}` : `${style.bg} hover:${style.border} border-slate-200`}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{style.icon}</span>
                    <span className="font-semibold text-slate-900 capitalize">{type.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {type === 'bridge_collapse' && 'Close access to a relocation site'}
                    {type === 'capacity_reduction' && 'Reduce usable shelter capacity'}
                    {type === 'rainfall' && 'Heavy rainfall increases flood risk'}
                    {type === 'combined' && 'Multiple simultaneous disruptions'}
                  </div>
                  {isSelected && <div className="absolute inset-0 bg-current/5 pointer-events-none" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Event-Specific Controls */}
        {eventType === 'bridge_collapse' && (
          <div className="card rounded-xl p-4 space-y-3 border-red-200 bg-red-50">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Select bridge to collapse</label>
            <select
              value={bridgeId}
              onChange={(e) => setBridgeId(e.target.value)}
              className="select-field"
            >
              {availableBridges.map((bridge) => (
                <option key={bridge.id} value={bridge.id}>{bridge.name}</option>
              ))}
            </select>
            <div className="card bg-red-50 rounded-lg p-3 space-y-1 border-red-100">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Target site:</span>
                <span className="font-mono text-slate-900">{selectedBridge?.targetSite ?? 'SITE_001'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Affected routes:</span>
                <span className="font-mono text-slate-600">{selectedBridge?.routes.join(', ')}</span>
              </div>
            </div>
          </div>
        )}

        {eventType === 'capacity_reduction' && (
          <div className="card rounded-xl p-4 space-y-4 border-orange-200 bg-orange-50">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Select affected shelters</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableShelters.map((shelter) => (
                <label key={shelter.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={shelterIds.includes(shelter.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShelterIds((current) => current.includes(shelter.id) ? current : [...current, shelter.id]);
                      } else {
                        setShelterIds((current) => current.filter((id) => id !== shelter.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-900">{shelter.name}</span>
                  <span className="text-[10px] font-mono text-slate-500 ml-auto">{shelter.site}</span>
                </label>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity reduction</label>
                <span className="text-sm font-semibold text-orange-600">{reductionPct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={10}
                value={reductionPct}
                onChange={(e) => setReductionPct(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>10%</span><span>50%</span><span>90%</span>
              </div>
            </div>
          </div>
        )}

        {eventType === 'rainfall' && (
          <div className="card rounded-xl p-4 space-y-4 border-blue-200 bg-blue-50">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Rainfall intensity</label>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500">Intensity multiplier</span>
                <span className="text-sm font-semibold text-blue-600">{rainfallIntensity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={rainfallIntensity}
                onChange={(e) => setRainfallIntensity(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.5x (Light)</span><span>1.0x (Moderate)</span><span>2.0x (Extreme)</span>
              </div>
            </div>
            <div className="card bg-blue-50 rounded-lg p-3 border-blue-100">
              <div className="text-xs text-slate-500">Estimated rainfall: <span className="font-mono text-slate-900">{Math.round(rainfallIntensity * 50)} mm/hr</span></div>
              <div className="text-xs text-slate-500 mt-1">Affects all habitations in Barpeta district. Triggers risk re-assessment and route validation.</div>
            </div>
          </div>
        )}

        {eventType === 'combined' && (
          <div className="card rounded-xl p-4 space-y-3 border-purple-200 bg-purple-50">
            <div className="text-xs text-slate-500">Combined event: Bridge collapse + Capacity reduction + Heavy rainfall</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Bridge</label>
                <select value={bridgeId} onChange={(e) => setBridgeId(e.target.value)} className="select-field text-sm">
                  {availableBridges.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Rainfall intensity</label>
                <input type="range" min={0.5} max={2.0} step={0.1} value={rainfallIntensity} onChange={(e) => setRainfallIntensity(Number(e.target.value))} className="w-full accent-purple-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Capacity reduction</label>
              <input type="range" min={10} max={90} step={10} value={reductionPct} onChange={(e) => setReductionPct(Number(e.target.value))} className="w-full accent-purple-500" />
            </div>
          </div>
        )}

        {/* Main Trigger Button */}
        <button
          type="button"
          onClick={handleTrigger}
          disabled={triggerEvent.isPending}
          className="w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-3 shadow-lg
            bg-gradient-to-r from-red-600 to-red-700 text-white
            hover:from-red-700 hover:to-red-800
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white"
        >
          {triggerEvent.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Simulating Event...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              SIMULATE DISASTER EVENT
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          Event → Plan validation → Invalidation → Re-optimization → New plan → Human approval → SMS
        </p>

        {/* Result Display */}
        {lastResult && (
          <div className={`card rounded-xl p-4 ${lastResult.error ? 'border-red-200 bg-red-50' : isInvalidated ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              {lastResult.error ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-700">Simulation Failed</span>
                </>
              ) : isInvalidated ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-700">Plan Invalidated & Re-planned</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-700">Event Applied Successfully</span>
                </>
              )}
            </div>

            {lastResult.error && <p className="text-xs text-red-600 mb-2">{lastResult.error}</p>}
            {lastResult.message && <p className="text-xs text-slate-600 mb-3">{lastResult.message}</p>}

            {lastResult.previous_plan && (
              <div className="card bg-slate-50 rounded-lg p-3 mb-3 border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-2">Previous Plan</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>Version: <span className="font-mono text-slate-900">v{lastResult.previous_plan.version}</span></div>
                  <div>Status: <span className="font-mono text-slate-900">{lastResult.previous_plan.status}</span></div>
                  <div>Assigned: <span className="font-mono text-slate-900">{Number(lastResult.previous_plan.total_assigned_population ?? 0).toLocaleString()}</span></div>
                  {lastResult.previous_plan.invalidation_reason && (
                    <div className="col-span-3 text-red-600">Reason: {lastResult.previous_plan.invalidation_reason}</div>
                  )}
                </div>
              </div>
            )}

            {lastResult.new_plan && (
              <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-2">New Plan</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>Version: <span className="font-mono text-blue-600">v{lastResult.new_plan.version}</span></div>
                  <div>Status: <span className="font-mono text-green-600">{lastResult.new_plan.status}</span></div>
                  <div>
                    Assigned: <span className="font-mono text-slate-900">{Number(lastResult.new_plan.total_assigned_population ?? 0).toLocaleString()}</span>
                    {' · '}
                    Unmet: <span className="font-mono text-red-600">{Number(lastResult.new_plan.total_unmet_population ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Events */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Events</h4>
            {eventLog?.events?.length && <span className="text-xs text-slate-500">{eventLog.events.length} events</span>}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {eventLog?.events?.slice(0, 5).map((event, index) => (
              <div key={event.event_id ?? index} className="text-xs text-slate-600 flex items-center gap-2 p-2 card bg-slate-50 rounded-lg border-slate-200">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="font-medium text-slate-900 capitalize">{String(event.event_type ?? 'event').replace('_', ' ')}</span>
                {event.timestamp && (
                  <>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-500 font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </>
                )}
              </div>
            ))}
            {!eventLog?.events?.length && !lastResult && (
              <div className="text-xs text-slate-500 text-center py-4">No events simulated yet.</div>
            )}
          </div>
        </div>

        {/* SMS Alert History */}
        <div className="border-t border-slate-200 pt-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Alert History (SMS Log)</h4>
          <div className="max-h-48 overflow-y-auto space-y-2 text-[10px]">
            {smsLog?.entries?.length ? (
              smsLog.entries.slice(0, 10).map((entry, idx) => (
                <div key={entry.id ?? idx} className="flex items-center gap-2 p-2 card bg-slate-50 rounded-lg border-slate-200">
                  <span className={`w-2 h-2 rounded-full ${entry.status === 'delivered' ? 'bg-green-500' : entry.status === 'sent' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  <span className="font-medium text-slate-900 capitalize">{entry.message_type.replace(/_/g, ' ')}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-600">{entry.recipient_count} recipients</span>
                  <span className="text-slate-400 ml-auto font-mono">{new Date(entry.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 p-4 text-center">No SMS dispatched yet. Approve a plan to trigger alerts.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}