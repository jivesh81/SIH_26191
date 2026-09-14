'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

const DEMO_FLOW_STEPS = [
  { key: 'risk-intelligence', label: 'Risk Intelligence', href: '/command-center/risk-intelligence' },
  { key: 'vulnerable-habitations', label: 'Vulnerable Habitations', href: '/command-center/vulnerable-habitations' },
  { key: 'relocation-sites', label: 'Relocation Sites', href: '/command-center/relocation-sites' },
  { key: 'relocation-planning', label: 'Relocation Planning', href: '/command-center/relocation-planning' },
  { key: 'map-intelligence', label: 'Map Intelligence', href: '/command-center/map-intelligence' },
  { key: 'disaster-simulation', label: 'Disaster Simulation', href: '/command-center/disaster-simulation' },
  { key: 'plan-approvals', label: 'Plan Approvals', href: '/command-center/plan-approvals' },
  { key: 'alerts-telecom', label: 'Alerts & Telecom', href: '/command-center/alerts-telecom' },
];

interface DemoFlowContextType {
  isActive: boolean;
  currentStep: number;
  startDemoFlow: () => void;
  nextStep: () => void;
  previousStep: () => void;
  endDemoFlow: () => void;
}

const DemoFlowContext = createContext<DemoFlowContextType | null>(null);

export function useDemoFlow() {
  const context = useContext(DemoFlowContext);
  if (!context) {
    return {
      isActive: false,
      currentStep: 0,
      startDemoFlow: () => {},
      nextStep: () => {},
      previousStep: () => {},
      endDemoFlow: () => {},
    };
  }
  return context;
}

export function DemoFlowProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const storedActive = sessionStorage.getItem('demoFlowActive');
      const storedStep = sessionStorage.getItem('demoFlowStep');
      if (storedActive === 'true') {
        setIsActive(true);
        setCurrentStep(parseInt(storedStep || '0', 10));
      }
    }
  }, []);

  useEffect(() => {
    if (mounted && isActive) {
      const currentIndex = DEMO_FLOW_STEPS.findIndex(step => pathname === step.href || pathname.startsWith(step.href + '/'));
      if (currentIndex >= 0) {
        setCurrentStep(currentIndex);
      }
    }
  }, [pathname, isActive, mounted]);

  const startDemoFlow = () => {
    setIsActive(true);
    setCurrentStep(0);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('demoFlowActive', 'true');
      sessionStorage.setItem('demoFlowStep', '0');
    }
  };

  const nextStep = () => {
    if (currentStep < DEMO_FLOW_STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('demoFlowStep', String(next));
      }
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('demoFlowStep', String(prev));
      }
    }
  };

  const endDemoFlow = () => {
    setIsActive(false);
    setCurrentStep(0);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('demoFlowActive');
      sessionStorage.removeItem('demoFlowStep');
    }
  };

  return (
    <DemoFlowContext.Provider value={{ isActive, currentStep, startDemoFlow, nextStep, previousStep, endDemoFlow }}>
      {children}
    </DemoFlowContext.Provider>
  );
}

export { DEMO_FLOW_STEPS };