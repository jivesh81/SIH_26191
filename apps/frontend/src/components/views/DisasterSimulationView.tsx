"use client";

import { useState } from "react";
import {
  useTriggerEventMutation,
  useEventLog,
  useSMSLog,
  useActivePlan,
} from "@/hooks/useApi";
import { AlertTriangle, AlertCircle, CheckCircle, Loader2, Zap } from "lucide-react";
import { Button, Badge, Card, Select, Input } from "@/components/ui";

type EventType = "bridge_collapse" | "capacity_reduction";

export function DisasterSimulationView() {
  const [eventType, setEventType] = useState<EventType>("bridge_collapse");
  const [bridgeId, setBridgeId] = useState("bridge_chaulkhowa");
  const [shelterIds, setShelterIds] = useState<string[]>(["shelter_rc_barpeta"]);
  const [reductionPct, setReductionPct] = useState(50);
  const [lastResult, setLastResult] = useState<any>(null);

  const triggerEvent = useTriggerEventMutation();
  const { data: eventLog } = useEventLog();
  const { data: activePlan } = useActivePlan();

  const availableBridges = [
    { id: "bridge_chaulkhowa", name: "Chaulkhowa Bridge (SH-15)", routes: ["route_howly_1", "route_bajali_1"], targetSite: "SITE_001" },
    { id: "bridge_beki", name: "Beki River Bridge (NH-31)", routes: ["route_barpeta_1"], targetSite: "SITE_001" },
    { id: "bridge_kaldia", name: "Kaldia River Bridge", routes: ["route_mandia_2", "route_goberadhana_1"], targetSite: "SITE_004" },
    { id: "bridge_manas", name: "Manas River Bridge", routes: ["route_sarbhog_1"], targetSite: "SITE_002" },
  ];

  const availableShelters = [
    { id: "shelter_rc_barpeta", name: "Barpeta Relief Camp", site: "SITE_001" },
    { id: "shelter_rc_howly", name: "Howly Relief Camp", site: "SITE_002" },
    { id: "shelter_rc_mandia", name: "Mandia Relief Camp", site: "SITE_004" },
    { id: "shelter_rc_chenga", name: "Chenga Relief Camp", site: "SITE_004" },
    { id: "shelter_rc_bajali", name: "Bajali Relief Camp", site: "SITE_003" },
    { id: "shelter_rc_rupsi", name: "Rupsi Cyclone Shelter", site: "SITE_006" },
  ];

  const selectedBridge = availableBridges.find((b) => b.id === bridgeId);
  const currentPlan = activePlan?.plan;

  const playEmergencyBeeps = () => {
    try {
      if (typeof window === "undefined") return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioContext = new AudioContextClass();
      const startTime = audioContext.currentTime + 0.05;
      for (let i = 0; i < 10; i++) {
        const beepStart = startTime + i * 0.22;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(950, beepStart);
        gain.gain.setValueAtTime(0.0001, beepStart);
        gain.gain.exponentialRampToValueAtTime(0.28, beepStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, beepStart + 0.13);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(beepStart);
        oscillator.stop(beepStart + 0.14);
      }
      setTimeout(() => audioContext.close().catch(() => {}), 2600);
    } catch (e) {
      console.warn("Emergency beep failed:", e);
    }
  };

  const handleTrigger = async () => {
    playEmergencyBeeps();

    let event: any;
    const BARPETA_BBOX = { min_lng: 90.5, min_lat: 26.0, max_lng: 91.5, max_lat: 27.0 };

    if (eventType === "bridge_collapse") {
      event = { event_type: "bridge_collapse", intensity: 1.0, affected_area: BARPETA_BBOX, duration_hours: 6, metadata: { bridge_id: bridgeId } };
    } else {
      event = { event_type: "capacity_reduction", intensity: reductionPct / 100, affected_area: BARPETA_BBOX, duration_hours: 6, metadata: { shelter_ids: shelterIds, reduction_pct: reductionPct } };
    }

    try {
      const result = await triggerEvent.mutateAsync(event);
      setLastResult(result);
    } catch (error) {
      console.error("Failed to trigger event:", error);
      setLastResult({ plan_invalidated: false, error: error instanceof Error ? error.message : "Failed to simulate event" });
    }
  };

  const isInvalidated = Boolean(lastResult?.plan_invalidated);

  const getResultCardClass = () => {
    if (lastResult?.error) return "border-red-200 bg-red-50";
    if (isInvalidated) return "border-red-200 bg-red-50";
    return "border-green-200 bg-green-50";
  };

  const getResultIcon = () => {
    if (lastResult?.error) return <AlertCircle className="w-5 h-5 text-red-600" />;
    if (isInvalidated) return <AlertCircle className="w-5 h-5 text-red-600" />;
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getResultTitle = () => {
    if (lastResult?.error) return "Simulation Failed";
    if (isInvalidated) return "Plan Invalidated & Re-planned";
    return "Event Applied Successfully";
  };

  const getResultTitleClass = () => {
    if (lastResult?.error) return "font-semibold text-red-700";
    if (isInvalidated) return "font-semibold text-red-700";
    return "font-semibold text-green-700";
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Disaster Simulation</h2>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Disaster Simulation
              </h3>
              <p className="text-xs text-slate-500 mt-1">Simulate a disruption and trigger automatic re-planning.</p>
            </div>
            <Badge variant="danger" size="sm" dot dotColor="bg-red-500">LIVE DEMO</Badge>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select disaster event</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                ["bridge_collapse", "capacity_reduction"] as EventType[]
              ).map((type) => {
                const isSelected = eventType === type;
                const style = type === "bridge_collapse" ? { bg: "bg-red-50", border: "border-red-200", icon: "🌉", label: "Bridge Collapse", desc: "Close access to a relocation site" } : { bg: "bg-orange-50", border: "border-orange-200", icon: "🏕️", label: "Capacity Reduction", desc: "Reduce usable shelter capacity" };
                const buttonClass = isSelected
                  ? `card p-3 text-left transition-all ring-2 ${style.border} ${style.bg}`
                  : `card p-3 text-left transition-all ${style.bg} hover:${style.border} border-slate-200`;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventType(type)}
                    className={buttonClass}
                  >
                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <span className="text-lg">{style.icon}</span>
                      {style.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{style.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {eventType === "bridge_collapse" && (
            <Card variant="outlined" className="p-3 space-y-2 border-red-200 bg-red-50">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Access route to close</label>
              <Select value={bridgeId} onChange={(e) => setBridgeId(e.target.value)} options={availableBridges.map((b) => ({ value: b.id, label: b.name }))} />
              <div className="text-xs text-slate-500 space-y-1">
                <div>Target site: <span className="font-medium text-slate-700">{selectedBridge?.targetSite ?? "SITE_001"}</span></div>
                <div>Affected routes: <span className="font-medium text-slate-700">{selectedBridge?.routes.join(", ")}</span></div>
              </div>
            </Card>
          )}

          {eventType === "capacity_reduction" && (
            <Card variant="outlined" className="p-3 space-y-3 border-orange-200 bg-orange-50">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Affected shelter</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableShelters.map((shelter) => (
                  <label key={shelter.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={shelterIds.includes(shelter.id)} onChange={(e) => { if (e.target.checked) { setShelterIds((c) => c.includes(shelter.id) ? c : [...c, shelter.id]); } else { setShelterIds((c) => c.filter((id) => id !== shelter.id)); } }} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-slate-700">{shelter.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 ml-auto">{shelter.site}</span>
                  </label>
                ))}
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity reduction</label>
                  <span className="text-sm font-semibold text-orange-600">{reductionPct}%</span>
                </div>
                <input type="range" min={10} max={90} step={10} value={reductionPct} onChange={(e) => setReductionPct(Number(e.target.value))} className="w-full accent-orange-500" />
                <div className="flex justify-between text-[10px] text-slate-400"><span>10%</span><span>50%</span><span>90%</span></div>
              </div>
            </Card>
          )}

          <Button
            variant="primary"
            fullWidth
            size="lg"
            disabled={triggerEvent.isPending}
            onClick={handleTrigger}
            leftIcon={triggerEvent.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          >
            {triggerEvent.isPending ? "Simulating Event..." : "SIMULATE DISASTER EVENT"}
          </Button>

          <p className="text-center text-xs text-slate-400">Event to plan validation to invalidation to re-optimization</p>

          {lastResult && (
            <Card variant="outlined" className={"p-3 " + getResultCardClass()}>
              <div className="flex items-center gap-2 mb-2">
                {getResultIcon()}
                <span className={getResultTitleClass()}>{getResultTitle()}</span>
              </div>
              {lastResult.error && <p className="text-xs text-red-600 mb-2">{lastResult.error}</p>}
              {lastResult.message && <p className="text-xs text-slate-600 mb-2">{lastResult.message}</p>}
              {lastResult.previous_plan && (
                <Card variant="outlined" className="p-2 mb-2 border-slate-200 bg-slate-50">
                  <div className="text-xs font-semibold text-slate-700 mb-1">Previous Plan</div>
                  <div className="text-xs text-slate-500">Version: v{lastResult.previous_plan.version}</div>
                  <div className="text-xs text-slate-500">Status: {lastResult.previous_plan.status}</div>
                  {lastResult.previous_plan.invalidation_reason && <div className="text-xs text-red-600 mt-1">Reason: {lastResult.previous_plan.invalidation_reason}</div>}
                </Card>
              )}
              {lastResult.new_plan && (
                <Card variant="outlined" className="p-2 border-slate-200 bg-slate-50">
                  <div className="text-xs font-semibold text-slate-700 mb-1">New Plan</div>
                  <div className="text-xs text-slate-500">Version: v{lastResult.new_plan.version}</div>
                  <div className="text-xs text-slate-500">Status: {lastResult.new_plan.status}</div>
                  <div className="text-xs text-slate-500 mt-1">Assigned: {Number(lastResult.new_plan.total_assigned_population ?? 0).toLocaleString()} · Unmet: {Number(lastResult.new_plan.total_unmet_population ?? 0).toLocaleString()}</div>
                </Card>
              )}
            </Card>
          )}

          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Events</h4>
              {eventLog?.events?.length && <span className="text-xs text-slate-400">{eventLog.events.length} events</span>}
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {eventLog?.events?.slice(0, 5).map((event, idx) => (
                <div key={event.event_id ?? idx} className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="font-medium text-slate-700 capitalize">{String(event.event_type ?? "event").replace(/_/g, " ")}</span>
                  {event.timestamp && (<> <span className="text-slate-400">—</span> <span className="text-slate-400 font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span> </>)}
                </div>
              ))}
              {!eventLog?.events?.length && !lastResult && <div className="text-xs text-slate-400">No events simulated yet.</div>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}