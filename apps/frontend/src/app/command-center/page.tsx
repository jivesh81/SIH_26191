"use client";

import { OverviewView } from "@/components/views/OverviewView";
import { useView } from "@/context/ViewContext";

export default function CommandCenterOverview() {
  const { currentView } = useView();

  return (
    <div className="space-y-6 animate-fade-in">
      <OverviewView />
    </div>
  );
}