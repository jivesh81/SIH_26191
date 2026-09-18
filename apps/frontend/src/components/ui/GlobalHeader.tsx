"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Badge } from "@/components/ui";

interface GlobalHeaderProps {
  district?: string;
  systemStatus?: "operational" | "degraded" | "offline";
}

export function GlobalHeader({ district = "Barpeta, Assam", systemStatus = "operational" }: GlobalHeaderProps) {
  const pathname = usePathname();
  const isCommandCenter = pathname.startsWith("/command-center");

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "operational":
        return { dotColor: "bg-green-500", label: "OPERATIONAL", variant: "success" as const };
      case "degraded":
        return { dotColor: "bg-amber-500", label: "DEGRADED", variant: "warning" as const };
      default:
        return { dotColor: "bg-red-500", label: "OFFLINE", variant: "danger" as const };
    }
  };

  const statusConfig = getStatusConfig(systemStatus);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 h-[56px]">
      <div className="max-w-full h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/command-center"
            className="flex items-center gap-2.5 flex-shrink-0"
            aria-label="Aapda Setu Home"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v2m0 0H9m3 0h3" />
              </svg>
            </div>
            <div className="hidden sm:block min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">Aapda Setu</h1>
              <p className="text-xs text-slate-500 truncate">Disaster Intelligence Platform</p>
            </div>
          </Link>

          {isCommandCenter && (
            <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
              <Badge variant="info" size="sm" className="whitespace-nowrap">
                {district}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <Badge variant={statusConfig.variant} size="sm" dot dotColor={statusConfig.dotColor}>
              {statusConfig.label}
            </Badge>
          </div>

          <Link
            href="/command-center"
            className="hidden sm:inline-flex"
          >
            <Button variant="primary" size="sm">
              Enter Command Center
            </Button>
          </Link>

          <Button variant="ghost" size="icon" aria-label="Settings">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Button>
        </div>
      </div>
    </header>
  );
}