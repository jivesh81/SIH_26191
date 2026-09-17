"use client";

import { Route } from "@/lib/api";
import { Send, Copy, Check, X } from "lucide-react";
import { useState } from "react";

interface EvacuationGuidanceProps {
  siteName: string;
  route: Route | null;
  feasible: boolean;
  reason: string;
  transportMode: "BUS" | "CAR" | "BIKE" | "WALK" | "BOAT" | "NOT_AVAILABLE";
  estimatedTime: string;
  urgency: "IMMEDIATE" | "URGENT" | "PLANNED" | "NOT_AVAILABLE";
  onClose: () => void;
}

export function EvacuationGuidance({
  siteName,
  route,
  feasible,
  reason,
  transportMode,
  estimatedTime,
  urgency,
  onClose,
}: EvacuationGuidanceProps) {
  const [copied, setCopied] = useState(false);

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case "BUS":
        return "🚌";
      case "CAR":
        return "🚗";
      case "BIKE":
        return "🏍️";
      case "WALK":
        return "🚶";
      case "BOAT":
        return "🚤";
      default:
        return "❓";
    }
  };

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case "IMMEDIATE":
        return {
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
          icon: "🚨",
        };
      case "URGENT":
        return {
          bg: "bg-orange-50",
          text: "text-orange-700",
          border: "border-orange-200",
          icon: "⚠️",
        };
      case "PLANNED":
        return {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: "📋",
        };
      default:
        return {
          bg: "bg-slate-50",
          text: "text-slate-700",
          border: "border-slate-200",
          icon: "❓",
        };
    }
  };

  const urgencyConfig = getUrgencyConfig(urgency);

  const handleCopy = () => {
    const message = feasible
      ? `⚠ EVACUATION ALERT: Proceed to ${siteName} via ${route?.name ?? "designated route"}. Mode: ${transportMode}. Est. time: ${estimatedTime}. Urgency: ${urgency}. Follow official instructions. Aapda Setu.`
      : `⚠ EVACUATION ALERT: ${siteName} has NO FEASIBLE ROUTE. Reason: ${reason}. Seek alternative shelter immediately. Aapda Setu.`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-elevated rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-3xl">🚨</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Evacuation Guidance
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Destination:{" "}
                <span className="font-semibold text-slate-900">{siteName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Feasibility Status */}
          <div
            className={`card rounded-xl p-4 ${feasible ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl flex-shrink-0">
                {feasible ? "✅" : "❌"}
              </span>
              <div className="flex-1">
                <div className="text-lg font-bold text-slate-900">
                  {feasible ? "Route Feasible" : "No Feasible Evacuation Route"}
                </div>
                <div className="text-sm text-slate-500 mt-1">{reason}</div>
              </div>
            </div>
          </div>

          {/* Route Details */}
          {route && (
            <div className="card rounded-xl p-4 space-y-3">
              <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Route Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                  <span className="text-xs text-slate-500">Route</span>
                  <div className="font-semibold text-slate-900">
                    {route.name}
                  </div>
                </div>
                <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                  <span className="text-xs text-slate-500">Status</span>
                  <div
                    className={`font-semibold ${route.status === "impassable" ? "text-red-600" : "text-green-600"}`}
                  >
                    {route.status}
                  </div>
                </div>
                <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                  <span className="text-xs text-slate-500">Distance</span>
                  <div className="font-semibold text-slate-900">
                    {route.length_km?.toFixed(1)} km
                  </div>
                </div>
                <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                  <span className="text-xs text-slate-500">Travel Time</span>
                  <div className="font-semibold text-slate-900">
                    {route.travel_time_min?.toFixed(0)} min
                  </div>
                </div>
                <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                  <span className="text-xs text-slate-500">Type</span>
                  <div className="font-semibold text-slate-900 capitalize">
                    {route.route_type}
                  </div>
                </div>
                <div className="card bg-slate-50 rounded-lg p-3 border-slate-200">
                  <span className="text-xs text-slate-500">Capacity</span>
                  <div className="font-semibold text-slate-900">
                    {route.capacity_per_hour}/hr
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transport & Timing */}
          <div className="card rounded-xl p-4 space-y-4">
            <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Evacuation Parameters
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div
                className={`card rounded-lg p-3 ${urgencyConfig.bg} ${urgencyConfig.border}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">
                    {getTransportIcon(transportMode)}
                  </span>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                      Transport Mode
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      {transportMode}
                    </div>
                  </div>
                </div>
                {transportMode === "NOT_AVAILABLE" && (
                  <div className="text-xs text-slate-500">
                    Transport mode not available from current data
                  </div>
                )}
                {transportMode === "BOAT" && (
                  <div className="text-xs text-amber-600 mt-1">
                    ⚠️ Boat routing unavailable for this scenario
                  </div>
                )}
              </div>

              <div className={`card rounded-lg p-3 bg-blue-50 border-blue-200`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">⏱️</span>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                      Estimated Travel Time
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      {estimatedTime}
                    </div>
                  </div>
                </div>
                {estimatedTime === "Not available from current data" && (
                  <div className="text-xs text-slate-500">
                    ETA not available from current data
                  </div>
                )}
                {estimatedTime === "Evacuation deadline unavailable." && (
                  <div className="text-xs text-amber-600 mt-1">
                    ⚠️ Evacuation deadline unavailable.
                  </div>
                )}
              </div>
            </div>

            <div
              className={`card rounded-lg p-3 ${urgencyConfig.bg} ${urgencyConfig.border}`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{urgencyConfig.icon}</span>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">
                    Evacuation Urgency
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {urgency}
                  </div>
                </div>
              </div>
              {urgency === "NOT_AVAILABLE" && (
                <div className="text-xs text-slate-500">
                  Urgency level not available from current data
                </div>
              )}
            </div>
          </div>

          {/* Route Status */}
          <div className="card rounded-xl p-4">
            <h4 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Route Status
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${
                  route?.status === "impassable"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-green-50 text-green-700 border border-green-200"
                }`}
              >
                {route?.status === "impassable" ? "🚫 BLOCKED" : "✅ OPEN"}
              </span>
              {route && route.bridge_dependencies?.length > 0 && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Bridges: {route.bridge_dependencies.join(", ")}
                </span>
              )}
            </div>
          </div>

          {/* Message Preview */}
          <div className="card rounded-xl p-4">
            <h4 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-slate-400" />
              SMS Message Preview
            </h4>
            <div className="card bg-slate-50 rounded-lg p-4 font-mono text-sm text-slate-700 whitespace-pre-wrap border border-slate-200">
              {feasible
                ? `⚠ EVACUATION ALERT: Proceed to ${siteName} via ${route?.name ?? "designated route"}. Mode: ${transportMode}. Est. time: ${estimatedTime}. Urgency: ${urgency}. Follow official instructions. Aapda Setu.`
                : `⚠ EVACUATION ALERT: ${siteName} has NO FEASIBLE ROUTE. Reason: ${reason}. Seek alternative shelter immediately. Aapda Setu.`}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all btn-primary flex items-center justify-center gap-2"
            >
              {copied ? (
                <Check className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
              {copied ? "Copied!" : "Copy Message"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
