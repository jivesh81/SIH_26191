"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useView, ViewName, VIEW_CONFIG } from "@/context/ViewContext";
import { useSidebar } from "@/context/SidebarContext";
import {
  LayoutDashboard,
  TriangleAlert,
  Route,
  Users,
  Building2,
  Map,
  CloudRain,
  Bell,
  ClipboardCheck,
  History,
  Info,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS: Array<{
  key: ViewName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  href: string;
}> = [
  {
    key: "overview",
    label: "Command Center",
    icon: LayoutDashboard,
    description: "Operational overview & KPIs",
    href: "/command-center",
  },
  {
    key: "risk-intelligence",
    label: "Risk Intelligence",
    icon: TriangleAlert,
    description: "Hazard & vulnerability analysis",
    href: "/command-center/risk-intelligence",
  },
  {
    key: "relocation-planning",
    label: "Relocation Planning",
    icon: Route,
    description: "Capacity & site assignment",
    href: "/command-center/relocation-planning",
  },
  {
    key: "vulnerable-habitations",
    label: "Vulnerable Habitations",
    icon: Users,
    description: "Prioritized habitation list",
    href: "/command-center/vulnerable-habitations",
  },
  {
    key: "relocation-sites",
    label: "Relocation Sites",
    icon: Building2,
    description: "Safe site details & capacity",
    href: "/command-center/relocation-sites",
  },
  {
    key: "map-intelligence",
    label: "Map Intelligence",
    icon: Map,
    description: "GIS layers & evacuation routes",
    href: "/command-center/map-intelligence",
  },
  {
    key: "disaster-simulation",
    label: "Disaster Simulation",
    icon: CloudRain,
    description: "Event simulation & re-optimization",
    href: "/command-center/disaster-simulation",
  },
  {
    key: "alerts-telecom",
    label: "Alerts & Telecom",
    icon: Bell,
    description: "SMS dispatch & approval status",
    href: "/command-center/alerts-telecom",
  },
  {
    key: "plan-approvals",
    label: "Plan Approvals",
    icon: ClipboardCheck,
    description: "Authority approval workflow",
    href: "/command-center/plan-approvals",
  },
  {
    key: "audit-activity",
    label: "Audit & Activity",
    icon: History,
    description: "Event log & system activity",
    href: "/command-center/audit-activity",
  },
  {
    key: "about-scope",
    label: "About / Scope",
    icon: Info,
    description: "Project scope & methodology",
    href: "/command-center/about-scope",
  },
];

export function CollapsibleSidebar() {
  const { currentView, setCurrentView } = useView();
  const { isOpen, setIsOpen, toggle } = useSidebar();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const pathView = NAV_ITEMS.find(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
    );
    if (pathView && pathView.key !== currentView) {
      setCurrentView(pathView.key);
    }
  }, [pathname, currentView, setCurrentView]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [setIsOpen]);

  const handleNavClick = (key: ViewName) => {
    setCurrentView(key);
    setIsMobileOpen(false);
    if (window.innerWidth >= 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleMobileSidebar}
        className="fixed top-4 left-4 z-50 md:hidden p-2 surface-elevated rounded-lg shadow-lg"
        aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isMobileOpen}
      >
        <svg
          className="w-6 h-6 text-slate-900"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          {isMobileOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-out md:translate-x-0 ${
          isOpen ? "w-72" : "w-16"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Command Center Navigation"
      >
        <div className="p-4 border-b border-slate-200 flex-shrink-0 flex items-center justify-between">
          <Link
            href="/command-center"
            className="flex items-center gap-3 flex-1 min-w-0"
            aria-label="Aapda Setu Home"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19v2m0 0H9m3 0h3"
                />
              </svg>
            </div>
            {isOpen && (
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-900 truncate">
                  Aapda Setu
                </h1>
                <p className="text-xs text-slate-500 truncate">
                  Command Center
                </p>
              </div>
            )}
          </Link>
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            <svg
              className="w-5 h-5 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {isOpen && (
          <>
            <nav
              className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin"
              role="navigation"
              aria-label="Main navigation"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = currentView === item.key;
                const isHovered = hoveredItem === item.key;
                const IconComponent = item.icon;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onMouseEnter={() => setHoveredItem(item.key)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => handleNavClick(item.key)}
                    className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                      isActive
                        ? "sidebar-item sidebar-item-active"
                        : "sidebar-item sidebar-item-inactive"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                    title={isOpen ? undefined : item.label}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                    )}

                    {!isActive && isHovered && (
                      <div className="absolute inset-0 bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl" />
                    )}

                    <span
                      className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${isActive ? "sidebar-item-icon sidebar-item-icon-active" : "sidebar-item-icon sidebar-item-icon-inactive"}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </span>

                    <div className="relative z-10 flex-1 min-w-0">
                      <p
                        className={`font-semibold text-sm truncate transition-colors duration-200 ${isActive ? "sidebar-item-label sidebar-item-label-active" : "sidebar-item-label sidebar-item-label-inactive"}`}
                      >
                        {item.label}
                      </p>
                      <p
                        className={`text-xs truncate mt-0.5 transition-colors duration-200 ${isActive ? "sidebar-item-desc sidebar-item-desc-active" : "sidebar-item-desc sidebar-item-desc-inactive"}`}
                      >
                        {item.description}
                      </p>
                    </div>

                    {isActive && (
                      <span className="sidebar-item-badge sidebar-item-badge-active">
                        ACTIVE
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 flex-shrink-0">
              <div className="surface rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  <span className="text-xs font-medium text-green-700 uppercase tracking-wider">
                    System Status
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <p className="text-lg font-extrabold text-blue-600 tabular-nums">
                      99.9%
                    </p>
                    <p className="text-[10px] text-slate-500">API Uptime</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100">
                    <p className="text-lg font-extrabold text-green-600 tabular-nums">
                      {"< 100ms"}
                    </p>
                    <p className="text-[10px] text-slate-500">Avg Latency</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-[10px] text-slate-500 text-center">
                    Barpeta, Assam • Demo Geography
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>

      {!isOpen && !isMobileOpen && (
        <button
          onClick={toggle}
          className="hidden md:block fixed top-4 z-40 p-2 surface-elevated rounded-lg shadow-lg border border-slate-200 transition-all duration-300"
          style={{ left: "64px" }}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={isOpen}
        >
          <Menu className="w-6 h-6 text-slate-900" />
        </button>
      )}
    </>
  );

  function toggleMobileSidebar() {
    setIsMobileOpen(!isMobileOpen);
  }
}
