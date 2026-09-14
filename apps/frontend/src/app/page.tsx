'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHealth, useReadiness, useApiHealth } from '@/hooks/useApi';

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [demoFlowStep, setDemoFlowStep] = useState(0);

  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: readiness, isLoading: readinessLoading } = useReadiness();
  const { data: apiHealth, isLoading: apiHealthLoading } = useApiHealth();

  const demoFlowSteps = [
    { label: 'Risk Intelligence', href: '/command-center/risk-intelligence', description: 'View vulnerability scores & ML risk predictions' },
    { label: 'Vulnerable Habitations', href: '/command-center/vulnerable-habitations', description: 'Prioritized habitation list with population & routes' },
    { label: 'Relocation Sites', href: '/command-center/relocation-sites', description: 'Safe site capacities & infrastructure readiness' },
    { label: 'Relocation Planning', href: '/command-center/relocation-planning', description: 'Run CP-SAT optimization & capacity what-if' },
    { label: 'Map Intelligence', href: '/command-center/map-intelligence', description: 'Interactive GIS with habitations, sites & routes' },
    { label: 'Disaster Simulation', href: '/command-center/disaster-simulation', description: 'Simulate bridge collapse → re-optimization' },
    { label: 'Plan Approvals', href: '/command-center/plan-approvals', description: 'Human authority approval → SMS dispatch' },
    { label: 'Alerts & Telecom', href: '/command-center/alerts-telecom', description: 'SMS delivery status & recipient coverage' },
  ];

  const startDemoFlow = () => {
    setDemoFlowStep(0);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('demoFlowActive', 'true');
      sessionStorage.setItem('demoFlowStep', '0');
    }
    router.push(demoFlowSteps[0].href);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-blue-600 animate-pulse" />
      </div>
    );
  }

  const systemServices = [
    { name: 'API / Backend', status: health?.status === 'healthy' ? 'operational' : 'degraded', check: health?.status === 'healthy' },
    { name: 'Risk Engine', status: apiHealth?.status === 'healthy' ? 'operational' : 'degraded', check: apiHealth?.status === 'healthy' },
    { name: 'Optimization Engine', status: readiness?.status === 'ready' ? 'operational' : 'degraded', check: readiness?.status === 'ready' },
    { name: 'Map / GIS Services', status: 'operational', check: true },
    { name: 'Alert / SMS Service', status: 'operational', check: true },
  ];

  const primaryActions = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
      title: 'Simulate Disaster',
      description: 'Trigger bridge collapse, rainfall, or capacity reduction events',
      href: '/command-center/disaster-simulation',
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      hoverBg: 'hover:bg-red-100',
      textColor: 'text-red-700',
      iconBg: 'bg-red-100',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      title: 'Find Safe Shelter',
      description: 'Locate relocation sites with capacity, infrastructure & route feasibility',
      href: '/command-center/relocation-sites',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverBg: 'hover:bg-green-100',
      textColor: 'text-green-700',
      iconBg: 'bg-green-100',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19.5l7.5-7.5M3.75 12l9-9" />
        </svg>
      ),
      title: 'Relocation What-If',
      description: 'Input occupied capacity, run CP-SAT optimization, get alternative sites',
      href: '/command-center/relocation-planning',
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverBg: 'hover:bg-purple-100',
      textColor: 'text-purple-700',
      iconBg: 'bg-purple-100',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v2m0 0H9m3 0h3" />
        </svg>
      ),
      title: 'Risk Intelligence',
      description: 'Hazard exposure, vulnerability scores, ML risk predictions for habitations',
      href: '/command-center/risk-intelligence',
      color: 'orange',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      hoverBg: 'hover:bg-orange-100',
      textColor: 'text-orange-700',
      iconBg: 'bg-orange-100',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      title: 'Map Intelligence',
      description: 'Interactive GIS with Barpeta habitations, sites, routes & evacuation paths',
      href: '/command-center/map-intelligence',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverBg: 'hover:bg-blue-100',
      textColor: 'text-blue-700',
      iconBg: 'bg-blue-100',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
      title: 'Alerts & Telecom',
      description: 'SMS dispatch, approval gates, delivery status, recipient coverage',
      href: '/command-center/alerts-telecom',
      color: 'amber',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      hoverBg: 'hover:bg-amber-100',
      textColor: 'text-amber-700',
      iconBg: 'bg-amber-100',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v2m0 0H9m3 0h3" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Aapda Setu</h1>
                <p className="text-sm text-slate-500">Disaster Decision Support Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-sm font-medium text-slate-700">System Operational</span>
              </div>

              <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Geography</span>
                <span className="text-sm font-semibold text-slate-900">Barpeta, Assam</span>
              </div>

              <Link
                href="/command-center"
                className="btn-primary hidden sm:inline-flex items-center gap-2 px-6 py-2.5 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Enter Command Center
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Hero Content */}
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 mb-6 max-w-fit">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                </span>
                <span className="text-sm font-semibold text-blue-700 uppercase tracking-wider">Live Operational Platform</span>
              </div>

              <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                Disaster Intelligence
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  Decision Support
                </span>
              </h1>

              <p className="text-lg text-slate-600 max-w-xl mb-10 leading-relaxed">
                Aapda Setu provides real-time hazard assessment, vulnerable habitation prioritization,
                and CP-SAT optimized relocation planning for Barpeta district, Assam.
                Built for MHA/NDRF operational readiness.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-12">
                <Link
                  href="/command-center"
                  className="btn-primary-light group px-8 py-3.5 text-base shadow-lg shadow-blue-500/30"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Go to Command Center
                </Link>

                <button onClick={startDemoFlow} className="btn-secondary-light px-8 py-3.5 text-base">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  View Live Demo Flow
                </button>
              </div>

              {/* System Readiness */}
              <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider">System Readiness</p>
                    <p className="text-xs text-slate-500">All core services operational</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {systemServices.map((service) => (
                    <div key={service.name} className="text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${service.check ? 'bg-green-500' : 'bg-red-500'}`} />
                      <p className="text-xs font-medium text-slate-700">{service.name}</p>
                      <p className={`text-[10px] font-medium ${service.check ? 'text-green-600' : 'text-red-600'}`}>
                        {service.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Primary Actions */}
            <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
              <div className="bg-slate-50 rounded-2xl p-6 lg:p-8 border border-slate-200">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-2">What do you want to do?</h2>
                  <p className="text-sm text-slate-500">Select an operation to begin disaster assessment, evacuation planning, or relocation analysis.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {primaryActions.map((action) => (
                    <Link
                      key={action.title}
                      href={action.href}
                      className={`group flex items-start gap-4 p-5 rounded-xl border transition-all duration-200 ${action.bgColor} ${action.borderColor} ${action.hoverBg}`}
                    >
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${action.iconBg}`}>
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{action.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">{action.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Secondary Actions / Quick Access */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">All Operational Modules</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Navigate directly to critical operational modules. Each module connects to live backend data
              and supports the full disaster management workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAccessCard
              href="/command-center/risk-intelligence"
              icon="⚠️"
              title="Risk Intelligence"
              description="Hazard exposure, vulnerability scores, ML risk predictions for all habitations"
              badge="Live Data"
              badgeColor="blue"
              color="red"
            />
            <QuickAccessCard
              href="/command-center/vulnerable-habitations"
              icon="🏘️"
              title="Vulnerable Habitations"
              description="Prioritized habitation list with population, accessibility, and evacuation routes"
              badge="Priority Ranked"
              badgeColor="orange"
              color="orange"
            />
            <QuickAccessCard
              href="/command-center/relocation-sites"
              icon="🏕️"
              title="Relocation Sites"
              description="Safe site capacities, infrastructure readiness, and suitability scoring"
              badge="Capacity Live"
              badgeColor="green"
              color="green"
            />
            <QuickAccessCard
              href="/command-center/relocation-planning"
              icon="📋"
              title="Relocation Planning"
              description="CP-SAT optimization, capacity what-if, alternative site recommendations"
              badge="Optimizer Ready"
              badgeColor="purple"
              color="purple"
            />
            <QuickAccessCard
              href="/command-center/map-intelligence"
              icon="🗺️"
              title="Map Intelligence"
              description="Interactive GIS with habitations, sites, routes, and feasible evacuation paths"
              badge="Barpeta, Assam"
              badgeColor="blue"
              color="blue"
            />
            <QuickAccessCard
              href="/command-center/disaster-simulation"
              icon="🌊"
              title="Disaster Simulation"
              description="Bridge collapse, rainfall, capacity reduction events with re-optimization chain"
              badge="Event → Replan"
              badgeColor="red"
              color="red"
            />
            <QuickAccessCard
              href="/command-center/alerts-telecom"
              icon="📡"
              title="Alerts & Telecom"
              description="SMS dispatch, approval gates, delivery status, recipient coverage tracking"
              badge="Approval Gated"
              badgeColor="amber"
              color="amber"
            />
            <QuickAccessCard
              href="/command-center/plan-approvals"
              icon="✅"
              title="Plan Approvals"
              description="Human authority workflow, version history, audit trail, authorization"
              badge="Authority Gate"
              badgeColor="green"
              color="green"
            />
          </div>
        </div>
      </section>

      {/* Demo Flow Section */}
      <section className="py-20 px-6 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Operational Demo Flow</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              End-to-end workflow from risk assessment to SMS notification — all connected to live backend APIs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { step: 1, title: 'Risk Intelligence', desc: 'Vulnerability scores, ML predictions, red zones', icon: '⚠️' },
              { step: 2, title: 'Vulnerable Habitations', desc: 'Prioritized habitation list with population & routes', icon: '🏘️' },
              { step: 3, title: 'Select Site', desc: 'Choose relocation site, view capacity, routes', icon: '🏕️' },
              { step: 4, title: 'Enter Occupied', desc: 'Input occupied capacity → remaining updates', icon: '📝' },
              { step: 5, title: 'Optimization', desc: 'CP-SAT runs, greedy fallback, assignments', icon: '⚙️' },
              { step: 6, title: 'Route Check', desc: 'Feasibility API → only viable paths shown', icon: '🛣️' },
              { step: 7, title: 'Evacuation Guidance', desc: 'Mode, ETA, urgency, route status, reason', icon: '🚨' },
              { step: 8, title: 'Simulate Event', desc: 'Bridge collapse → routes blocked → re-optimize', icon: '🌊' },
              { step: 9, title: 'Human Approval', desc: 'Authority reviews → approves current plan', icon: '👤' },
              { step: 10, title: 'SMS Dispatch', desc: 'Approved only → delivery tracked in history', icon: '📡' },
            ].map((item) => (
              <DemoFlowStep key={item.step} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v2m0 0H9m3 0h3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Aapda Setu</p>
              <p className="text-xs text-slate-500">Disaster Decision Support Platform</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <span>Barpeta, Assam Demo Geography</span>
            <span>•</span>
            <span>SIH 2026</span>
            <span>•</span>
            <span>MHA/NDRF Ready</span>
            <span>•</span>
            <span>No Synthetic Data in Production Paths</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>v1.0.0</span>
            <span className="flex items-center gap-1 text-blue-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
              </span>
              Live
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function QuickAccessCard({
  href,
  icon,
  title,
  description,
  badge,
  badgeColor,
  color,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'amber';
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'amber';
}) {
  const badgeColors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const colorClasses = {
    blue: 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100',
    green: 'hover:border-green-300 hover:shadow-lg hover:shadow-green-100',
    red: 'hover:border-red-300 hover:shadow-lg hover:shadow-red-100',
    purple: 'hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100',
    orange: 'hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100',
    amber: 'hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100',
  };

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-xl border bg-white p-5 transition-all duration-200 hover:-translate-y-1 ${colorClasses[color]}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent group-hover:from-blue-500/5 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <span className="text-3xl">{icon}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeColors[badgeColor]}`}>
            {badge}
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{description}</p>
        <div className="flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-blue-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Open Module
        </div>
      </div>
    </Link>
  );
}

function DemoFlowStep({
  step,
  title,
  desc,
  icon,
}: {
  step: number;
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 relative shadow-sm hover:shadow-md transition-shadow">
      <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
        {step}
      </div>
      <div className="relative z-10">
        <span className="text-2xl mb-3 block">{icon}</span>
        <h4 className="text-sm font-bold text-slate-900 mb-1">{title}</h4>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}