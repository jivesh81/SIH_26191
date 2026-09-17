'use client';

import { ReactNode } from 'react';
import { CollapsibleSidebar } from '@/components/ui/CollapsibleSidebar';
import { PersistentLiveMapPanel } from '@/components/map/PersistentLiveMap';
import { CommandCenterHeader } from '@/components/ui/CommandCenterHeader';
import { EmergencyStatusBanner } from '@/components/ui/EmergencyStatusBanner';
import { useSidebar } from '@/context/SidebarContext';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <CollapsibleSidebar />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300" style={{ marginLeft: isOpen ? '288px' : '64px' }}>
        <CommandCenterHeader />
        <EmergencyStatusBanner />

        <div className="flex-1 flex flex-row min-h-0">
          <main className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto">
              {children}
            </div>
          </main>

          <aside className="hidden lg:block w-96 flex-shrink-0 border-l border-slate-200 bg-white h-full">
            <PersistentLiveMapPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}