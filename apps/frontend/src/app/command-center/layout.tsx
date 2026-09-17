"use client";

import { ViewProvider } from "@/context/ViewContext";
import { DemoFlowProvider } from "@/context/DemoFlowContext";
import { MapStateProvider } from "@/context/MapStateContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { AppShell } from "@/components/layout/AppShell";

export default function CommandCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewProvider>
      <DemoFlowProvider>
        <MapStateProvider>
          <SidebarProvider>
            <AppShell>{children}</AppShell>
          </SidebarProvider>
        </MapStateProvider>
      </DemoFlowProvider>
    </ViewProvider>
  );
}
