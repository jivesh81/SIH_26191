"use client";

import { useHabitations, usePredictRiskBatch } from "@/hooks/useApi";
import { RiskLevel } from "@/lib/api";
import { useEffect, useState } from "react";

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

  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(
    null,
  );

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
          <h2 className="text-lg font-semibold text-slate-900">
            Risk Intelligence
          </h2>
          <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
            Synthetic Demo Data
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            RiskLevel.RED_ZONE,
            RiskLevel.HIGH,
            RiskLevel.MEDIUM,
            RiskLevel.LOW,
          ].map((level) => (
            <div
              key={level}
              className="animate-pulse h-24 bg-slate-100 rounded-lg border border-slate-200"
            />
          ))}
        </div>
        <div className="animate-pulse h-64 bg-slate-100 rounded-lg border border-slate-200" />
      </div>
    );
  }

  if (habitationsError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Failed to load risk data
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Risk Intelligence
        </h2>
        <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
          Synthetic Demo Data
        </span>
      </div>

      {/* Risk Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            level: RiskLevel.RED_ZONE,
            label: "Red Zone",
            color: RISK_COLORS[RiskLevel.RED_ZONE],
          },
          {
            level: RiskLevel.HIGH,
            label: "High",
            color: RISK_COLORS[RiskLevel.HIGH],
          },
          {
            level: RiskLevel.MEDIUM,
            label: "Medium",
            color: RISK_COLORS[RiskLevel.MEDIUM],
          },
          {
            level: RiskLevel.LOW,
            label: "Low",
            color: RISK_COLORS[RiskLevel.LOW],
          },
        ].map(({ level, label, color }) => (
          <button
            key={level}
            onClick={() =>
              setSelectedRiskLevel(selectedRiskLevel === level ? null : level)
            }
            className={`rounded-lg border p-4 transition-all ${selectedRiskLevel === level ? "ring-2 ring-slate-900 bg-slate-50" : "bg-white hover:bg-slate-50"} h-full`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-semibold text-slate-500 uppercase">
                {label}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {riskCounts[level]}
            </div>
            <div className="text-xs text-slate-500 mt-1">habitations</div>
          </button>
        ))}
      </div>

      {/* Risk Detail Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">
            Habitation Risk Details
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                <th className="px-3 py-2">Habitation</th>
                <th className="px-3 py-2">Population</th>
                <th className="px-3 py-2">Vulnerability</th>
                <th className="px-3 py-2">Deterministic Risk</th>
                <th className="px-3 py-2">ML Risk</th>
                <th className="px-3 py-2">Final Risk</th>
                <th className="px-3 py-2">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredHabitations.slice(0, 50).map((habitation, idx) => {
                const detRisk =
                  habitation.vulnerability_score >= 0.85
                    ? RiskLevel.RED_ZONE
                    : habitation.vulnerability_score >= 0.7
                      ? RiskLevel.HIGH
                      : habitation.vulnerability_score >= 0.5
                        ? RiskLevel.MEDIUM
                        : RiskLevel.LOW;

                const mlPrediction = mlPredictions.find(
                  (p) => p.habitation_id === habitation.id,
                );
                const mlRisk = mlPrediction?.ml_risk_level ?? "N/A";
                const finalRisk = mlPrediction?.final_risk_level ?? detRisk;

                return (
                  <tr
                    key={habitation.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {habitation.name}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {habitation.population.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded"
                          style={{ backgroundColor: RISK_COLORS[detRisk] }}
                        />
                        <span>{habitation.vulnerability_score.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${RISK_COLORS[detRisk]}20`,
                          color: RISK_COLORS[detRisk],
                        }}
                      >
                        {RISK_LABELS[detRisk]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{mlRisk}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${RISK_COLORS[finalRisk]}20`,
                          color: RISK_COLORS[finalRisk],
                        }}
                      >
                        {RISK_LABELS[finalRisk]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {habitation.priority_rank ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredHabitations.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No habitations match the selected risk level.
          </div>
        )}
      </div>

      {/* ML Model Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-amber-800 mb-2">
          <span>⚠️</span>
          <span className="font-semibold">
            ML Predictions are Synthetic Demo Data
          </span>
        </div>
        <p className="text-sm text-amber-700">
          ML risk predictions use a RandomForest model trained on synthetic
          historical data generated from the Barpeta demo dataset. Final risk
          uses the more conservative (higher) of deterministic and ML
          predictions.
          <strong>Not official government data.</strong>
        </p>
      </div>
    </div>
  );
}
