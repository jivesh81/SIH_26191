"use client";

import { useHabitations, usePredictRiskBatch } from "@/hooks/useApi";
import { RiskLevel } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, Badge, DataTable } from "@/components/ui";

const RISK_COLORS: Record<string, string> = {
  [RiskLevel.RED_ZONE]: "#991b1b",
  [RiskLevel.HIGH]: "#dc2626",
  [RiskLevel.MEDIUM]: "#f97316",
  [RiskLevel.LOW]: "#16a34a",
};

const RISK_LABELS: Record<string, string> = {
  [RiskLevel.RED_ZONE]: "RED ZONE",
  [RiskLevel.HIGH]: "HIGH",
  [RiskLevel.MEDIUM]: "MEDIUM",
  [RiskLevel.LOW]: "LOW",
};

export function RiskIntelligenceView() {
  const {
    data: habitationsData,
    isLoading: habitationsLoading,
    error: habitationsError,
  } = useHabitations(false);
  const { data: mlRiskData, isLoading: mlLoading } = usePredictRiskBatch();

  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null);

  const habitations = habitationsData?.habitations ?? [];
  const mlPredictions = mlRiskData?.predictions ?? [];

  const riskCounts = {
    [RiskLevel.RED_ZONE]: 0,
    [RiskLevel.HIGH]: 0,
    [RiskLevel.MEDIUM]: 0,
    [RiskLevel.LOW]: 0,
  };

  habitations.forEach((h) => {
    const detRisk =
      h.vulnerability_score >= 0.85
        ? RiskLevel.RED_ZONE
        : h.vulnerability_score >= 0.7
        ? RiskLevel.HIGH
        : h.vulnerability_score >= 0.5
        ? RiskLevel.MEDIUM
        : RiskLevel.LOW;
    riskCounts[detRisk]++;
  });

  const filteredHabitations = selectedRiskLevel
    ? habitations.filter((h) => {
        const detRisk =
          h.vulnerability_score >= 0.85
            ? RiskLevel.RED_ZONE
            : h.vulnerability_score >= 0.7
            ? RiskLevel.HIGH
            : h.vulnerability_score >= 0.5
            ? RiskLevel.MEDIUM
            : RiskLevel.LOW;
        return detRisk === selectedRiskLevel;
      })
    : habitations;

  if (habitationsLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Risk Intelligence</h2>
          <Badge variant="warning" size="sm">Synthetic Demo Data</Badge>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[RiskLevel.RED_ZONE, RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW].map((level) => (
            <div key={level} className="animate-pulse card p-5" />
          ))}
        </div>
        <div className="animate-pulse card min-h-[400px]" />
      </div>
    );
  }

  if (habitationsError) {
    return (
      <Card variant="outlined" className="p-4 bg-red-50 border-red-200">
        <div className="text-red-700">Failed to load risk data</div>
      </Card>
    );
  }

  const columns = [
    {
      key: "name",
      header: "Habitation",
      accessor: (h: any) => h.name,
    },
    {
      key: "population",
      header: "Population",
      accessor: (h: any) => h.population.toLocaleString(),
      align: "right" as const,
      width: "120px",
      monospace: true,
    },
    {
      key: "vulnerability",
      header: "Vulnerability",
      accessor: (h: any) => {
        const detRisk =
          h.vulnerability_score >= 0.85
            ? RiskLevel.RED_ZONE
            : h.vulnerability_score >= 0.7
            ? RiskLevel.HIGH
            : h.vulnerability_score >= 0.5
            ? RiskLevel.MEDIUM
            : RiskLevel.LOW;
        const color = RISK_COLORS[detRisk];
        return (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
            <span className="font-mono">{h.vulnerability_score.toFixed(2)}</span>
          </div>
        );
      },
    },
    {
      key: "detRisk",
      header: "Deterministic Risk",
      accessor: (h: any) => {
        const detRisk =
          h.vulnerability_score >= 0.85
            ? RiskLevel.RED_ZONE
            : h.vulnerability_score >= 0.7
            ? RiskLevel.HIGH
            : h.vulnerability_score >= 0.5
            ? RiskLevel.MEDIUM
            : RiskLevel.LOW;
        const color = RISK_COLORS[detRisk];
        const variant = detRisk === RiskLevel.RED_ZONE ? "danger" : detRisk === RiskLevel.HIGH ? "danger" : detRisk === RiskLevel.MEDIUM ? "warning" : "success";
        return (
          <Badge variant={variant} size="sm" className="whitespace-nowrap" style={{ backgroundColor: `${color}20`, color }}>
            {RISK_LABELS[detRisk]}
          </Badge>
        );
      },
      align: "center" as const,
      width: "140px",
    },
    {
      key: "mlRisk",
      header: "ML Risk",
      accessor: (h: any) => {
        const mlPrediction = mlPredictions.find((p: any) => p.habitation_id === h.id);
        return mlPrediction?.ml_risk_level ?? "N/A";
      },
      align: "center" as const,
      width: "120px",
    },
    {
      key: "finalRisk",
      header: "Final Risk",
      accessor: (h: any) => {
        const mlPrediction = mlPredictions.find((p: any) => p.habitation_id === h.id);
        const detRisk =
          h.vulnerability_score >= 0.85
            ? RiskLevel.RED_ZONE
            : h.vulnerability_score >= 0.7
            ? RiskLevel.HIGH
            : h.vulnerability_score >= 0.5
            ? RiskLevel.MEDIUM
            : RiskLevel.LOW;
        const finalRisk = mlPrediction?.final_risk_level ?? detRisk;
        const color = RISK_COLORS[finalRisk];
        const variant = finalRisk === RiskLevel.RED_ZONE ? "danger" : finalRisk === RiskLevel.HIGH ? "danger" : finalRisk === RiskLevel.MEDIUM ? "warning" : "success";
        return (
          <Badge variant={variant} size="sm" className="whitespace-nowrap" style={{ backgroundColor: `${color}20`, color }}>
            {RISK_LABELS[finalRisk]}
          </Badge>
        );
      },
      align: "center" as const,
      width: "120px",
    },
    {
      key: "priority",
      header: "Priority",
      accessor: (h: any) => h.priority_rank ?? "—",
      align: "center" as const,
      width: "100px",
      monospace: true,
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Risk Intelligence</h2>
        <Badge variant="warning" size="sm">Synthetic Demo Data</Badge>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { level: RiskLevel.RED_ZONE, label: "Red Zone", color: RISK_COLORS[RiskLevel.RED_ZONE] },
          { level: RiskLevel.HIGH, label: "High", color: RISK_COLORS[RiskLevel.HIGH] },
          { level: RiskLevel.MEDIUM, label: "Medium", color: RISK_COLORS[RiskLevel.MEDIUM] },
          { level: RiskLevel.LOW, label: "Low", color: RISK_COLORS[RiskLevel.LOW] },
        ].map(({ level, label, color }) => (
          <button
            key={level}
            onClick={() => setSelectedRiskLevel(selectedRiskLevel === level ? null : level)}
            className={`card p-4 transition-all duration-200 h-full ${selectedRiskLevel === level ? "ring-2 ring-blue-400 bg-blue-50" : "bg-white hover:bg-slate-50"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{riskCounts[level]}</div>
            <div className="text-xs text-slate-500 mt-1">habitations</div>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Habitation Risk Details</h3>
        </div>
        <DataTable
          columns={columns}
          data={filteredHabitations.slice(0, 100)}
          keyAccessor={(h: any) => h.id}
          emptyMessage="No habitations match the selected risk level."
        />
        {filteredHabitations.length > 100 && (
          <div className="px-4 py-3 border-t border-slate-200 text-center text-xs text-slate-500">
            Showing 100 of {filteredHabitations.length} habitations. Refine filters to see more.
          </div>
        )}
      </Card>

      <Card variant="outlined" className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-2 text-amber-800 mb-2">
          <span className="text-lg">⚠️</span>
          <span className="font-semibold">ML Predictions are Synthetic Demo Data</span>
        </div>
        <p className="text-sm text-amber-700">
          ML risk predictions use a RandomForest model trained on synthetic historical data generated from the Barpeta demo dataset. Final risk uses the more conservative (higher) of deterministic and ML predictions.
          <strong className="text-amber-800">Not official government data.</strong>
        </p>
      </Card>
    </div>
  );
}