"use client";

import { Card, Badge, Button } from "@/components/ui";

export function AboutScopeView() {
  const capabilities = [
    { icon: "⚠️", title: "Risk Intelligence", description: "Deterministic hazard exposure scoring + ML risk prediction (RandomForest) for all habitations. Red-zone identification with priority ranking.", features: ["Flood depth modeling", "Vulnerability indices", "ML-enhanced predictions", "Priority-ranked habitations"] },
    { icon: "🏕️", title: "Relocation Site Management", description: "Safe site catalog with capacity, infrastructure readiness, suitability scoring, and real-time availability tracking.", features: ["Capacity tracking", "Infrastructure status", "Suitability scoring", "What-if simulation"] },
    { icon: "⚙️", title: "CP-SAT Optimization", description: "Constraint Programming (OR-Tools CP-SAT) for optimal habitation-to-site assignment minimizing distance and maximizing priority coverage.", features: ["Global optimum search", "Greedy fallback", "Capacity constraints", "Route feasibility integration"] },
    { icon: "🛣️", title: "Route Feasibility Engine", description: "Real-time evacuation route validation considering bridge status, road conditions, and capacity constraints. No straight-line assumptions.", features: ["Bridge dependency tracking", "Live route status", "Feasibility API", "Alternative route detection"] },
    { icon: "🌊", title: "Disaster Simulation", description: "Event-driven re-optimization chain: Event to Affected Area to Risk Change to Blocked Routes to Re-optimization to New Plan to Approval to SMS.", features: ["Bridge collapse", "Heavy rainfall", "Capacity reduction", "Combined events"] },
    { icon: "📡", title: "Alerts & Telecom", description: "SMS dispatch gated by human approval. Delivery tracking, recipient coverage, template management, and audit trail.", features: ["Approval-gated SMS", "Delivery status", "Message templates", "SMS history"] },
  ];

  const demoSteps = [
    { step: 1, title: "Risk Assessment", desc: "View vulnerability scores, ML predictions, and red-zone habitations in Risk Intelligence", icon: "1️⃣" },
    { step: 2, title: "Habitation Selection", desc: "Review prioritized habitations with population, accessibility, and nearest sites", icon: "2️⃣" },
    { step: 3, title: "Site Selection", desc: "Choose relocation site, view capacity, infrastructure, and route connections", icon: "3️⃣" },
    { step: 4, title: "Capacity Input", desc: "Enter occupied capacity to remaining capacity auto-updates in real-time", icon: "4️⃣" },
    { step: 5, title: "Optimization", desc: "Run CP-SAT optimizer (with greedy fallback) respecting capacity constraints", icon: "5️⃣" },
    { step: 6, title: "Route Verification", desc: "Feasibility API validates only genuinely viable evacuation paths", icon: "6️⃣" },
    { step: 7, title: "Evacuation Guidance", desc: "Transport mode, route, ETA, urgency, destination, and route status displayed", icon: "7️⃣" },
    { step: 8, title: "Disaster Event", desc: "Simulate bridge collapse to routes blocked to automatic re-optimization triggered", icon: "8️⃣" },
    { step: 9, title: "Human Approval", desc: "Authority reviews new plan, assignments, capacity, and routes before approval", icon: "9️⃣" },
    { step: 10, title: "SMS Dispatch", desc: "Approved plan triggers SMS notifications with delivery tracking in Alert History", icon: "🔟" },
  ];

  const techStack = [
    { category: "Frontend", items: ["Next.js 14 (App Router)", "React 18", "TypeScript", "Tailwind CSS", "MapLibre GL", "TanStack Query"] },
    { category: "Backend", items: ["FastAPI (Python)", "PostgreSQL + PostGIS", "Redis", "Celery", "WebSockets"] },
    { category: "Optimization", items: ["OR-Tools CP-SAT", "Greedy Fallback", "Custom Constraints", "Route Feasibility API"] },
    { category: "ML & GIS", items: ["RandomForest (sklearn)", "GeoPandas", "Synthetic Training Data", "Risk Prediction API"] },
  ];

  const geographyItems = [
    "District: Barpeta, Assam, India",
    "Bounds: 90.5degE to 91.5degE, 26.0degN to 27.0degN",
    "Center: 91.0degE, 26.5degN",
    "Key Rivers: Brahmaputra, Beki, Kaldia, Manas, Chaulkhowa",
    "Key Bridges: Chaulkhowa (SH-15), Beki (NH-31), Kaldia, Manas",
  ];

  const dataLayers = [
    "Vulnerable Habitations: Population, vulnerability, priority",
    "Relocation Sites: Capacity, infrastructure, suitability",
    "Evacuation Routes: Road network with bridge deps",
    "Hazard Zones: Flood depth, risk polygons",
    "Infrastructure: Bridges, roads, facilities",
    "Admin Boundaries: Blocks, district boundary",
  ];

  const integrityPrinciples = [
    "No synthetic data in production paths - ML predictions clearly labeled as demo",
    "Barpeta-only geography - No mixing of Wayanad/Kerala or other regions",
    "Real route feasibility - Never straight-line routes; only API-validated paths",
    "Human-in-the-loop - SMS only after authority approval, never auto-dispatch",
    "Capacity workflow preserved - Occupied to Remaining to Optimization to Alternative sites",
  ];

  const hardConstraints = [
    "SMS dispatch ONLY after human approval",
    "No automatic alerts on risk increase",
    "No straight-line evacuation routes",
    "No fake data to populate maps",
    "Barpeta geography only",
  ];

  const auditTrail = [
    "Every event logged with timestamp",
    "Plan versions tracked with invalidation reasons",
    "SMS delivery status recorded",
    "Approval decisions attributed",
    "Re-optimization chain documented",
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <Card className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v2m0 0H9m3 0h3" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Aapda Setu</h2>
            <p className="text-lg text-slate-600 mt-1">Disaster Decision Support Platform</p>
            <p className="text-sm text-slate-500 mt-2">SIH 2026 - Barpeta District, Assam</p>
          </div>
        </div>

        <div className="prose max-w-none text-slate-700 space-y-4">
          <p className="text-lg leading-relaxed"><strong className="text-slate-900">Aapda Setu</strong> (Disaster Bridge) is a decision support platform for disaster management authorities, designed to enable rapid, data-driven relocation planning during flood emergencies in Barpeta district, Assam.</p>
          <p className="leading-relaxed">The platform integrates <strong className="text-blue-700">hazard modeling</strong>, <strong className="text-blue-700">vulnerability assessment</strong>, <strong className="text-blue-700">CP-SAT optimization</strong>, and <strong className="text-blue-700">real-time route feasibility</strong> to generate actionable evacuation plans that respect ground constraints.</p>
          <p className="leading-relaxed">All operational decisions require <strong className="text-amber-700">human authority approval</strong> before SMS alerts are dispatched, ensuring accountability and preventing automated actions during crises.</p>
        </div>
      </Card>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Core Capabilities
        </h3>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <Card key={capability.title} className="p-6 hover:border-blue-300 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <span className="text-3xl flex-shrink-0">{capability.icon}</span>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">{capability.title}</h4>
                  <p className="text-sm text-slate-600">{capability.description}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {capability.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Operational Demo Flow
        </h3>

        <Card className="p-6">
          <div className="space-y-4">
            {demoSteps.map((step) => (
              <div key={step.step} className="flex items-start gap-4 p-4 card bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="text-2xl flex-shrink-0">{step.icon}</span>
                <div className="flex-1">
                  <h5 className="font-semibold text-slate-900 mb-1">{step.title}</h5>
                  <p className="text-sm text-slate-600">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          Technical Stack
        </h3>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {techStack.map((stack) => (
            <Card key={stack.category} className="p-5">
              <h4 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />{stack.category}
              </h4>
              <ul className="space-y-1">
                {stack.items.map((item) => (
                  <li key={item} className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="card p-8 bg-gradient-to-br from-blue-50 to-slate-50 border border-slate-200">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Geography & Data Sources
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Operational Geography</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              {geographyItems.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Data Layers (GeoJSON)</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              {dataLayers.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="font-semibold text-slate-900 mb-2">Data Integrity Principles</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            {integrityPrinciples.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Governance & Accountability
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="outlined" className="p-5 border-red-200 bg-red-50">
            <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Hard Constraints
            </h4>
            <ul className="space-y-2 text-sm text-red-700">
              {hardConstraints.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </Card>
          <Card variant="outlined" className="p-5 border-green-200 bg-green-50">
            <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Audit Trail
            </h4>
            <ul className="space-y-2 text-sm text-green-700">
              {auditTrail.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <div className="text-center py-8 border-t border-slate-200">
        <p className="text-slate-500 mb-2">Aapda Setu - Disaster Decision Support Platform</p>
        <p className="text-sm text-slate-500">Built for MHA/NDRF Operational Readiness - SIH 2026</p>
        <p className="text-xs text-slate-400 mt-2">All backend APIs connected - Barpeta, Assam Demo Geography - No Synthetic Data in Production Paths</p>
      </div>
    </div>
  );
}