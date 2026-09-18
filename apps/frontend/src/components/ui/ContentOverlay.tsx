"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ContentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  description?: string;
  position?: "top-right" | "top-left" | "right" | "bottom";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showHeader?: boolean;
  showMaximize?: boolean;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

const SIZE_CLASSES = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[38rem]",
  xl: "w-[48rem]",
  full: "w-full max-w-5xl",
};

const POSITION_CLASSES = {
  "top-right": "top-16 right-4",
  "top-left": "top-16 left-4",
  right: "right-0 top-16 h-[calc(100vh-4rem)]",
  bottom: "bottom-0 left-1/2 -translate-x-1/2 max-h-[60vh]",
};

export function ContentOverlay({
  isOpen,
  onClose,
  children,
  title,
  description,
  position = "top-right",
  size = "md",
  showHeader = true,
  showMaximize = false,
  onMaximize,
  isMaximized = false,
}: ContentOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      setTimeout(() => overlayRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const baseClasses = `
    fixed z-50 bg-white border border-slate-200 rounded-xl shadow-2xl
    transition-all duration-300 ease-out
    flex flex-col overflow-hidden
    ${SIZE_CLASSES[size]}
    ${POSITION_CLASSES[position]}
    ${isMaximized ? "fixed inset-4 max-h-[calc(100vh-8rem)] w-[calc(100vw-8rem)]" : ""}
  `;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={overlayRef}
        tabIndex={-1}
        className={cn(baseClasses, "animate-slide-in")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "overlay-title" : undefined}
        aria-describedby={description ? "overlay-description" : undefined}
      >
        {showHeader && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h2 id="overlay-title" className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
              {description && <p id="overlay-description" className="text-xs text-slate-500 truncate mt-0.5">{description}</p>}
            </div>
            <div className="flex items-center gap-1 ml-4">
              {showMaximize && onMaximize && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMaximize}
                  aria-label={isMaximized ? "Minimize" : "Maximize"}
                  className="h-8 w-8"
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close panel"
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4" tabIndex={0}>
          {children}
        </div>
      </div>
    </>
  );
}

interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  description?: string;
  side?: "left" | "right";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showHeader?: boolean;
}

const DRAWER_SIZE_CLASSES = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[38rem]",
  xl: "w-[48rem]",
  full: "w-full max-w-5xl",
};

export function SlideOverDrawer({
  isOpen,
  onClose,
  children,
  title,
  description,
  side = "right",
  size = "lg",
  showHeader = true,
}: SlideOverDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      setTimeout(() => drawerRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sideClasses = side === "right" ? "right-0" : "left-0";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={cn(
          "fixed top-16 bottom-0 z-50 bg-white border border-slate-200 shadow-2xl",
          "flex flex-col overflow-hidden transition-transform duration-300 ease-out",
          "animate-slide-in",
          side === "right" ? "translate-x-0" : "translate-x-0",
          DRAWER_SIZE_CLASSES[size],
          sideClasses
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "drawer-title" : undefined}
        aria-describedby={description ? "drawer-description" : undefined}
      >
        {showHeader && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h2 id="drawer-title" className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
              {description && <p id="drawer-description" className="text-xs text-slate-500 truncate mt-0.5">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer" className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4" tabIndex={0}>
          {children}
        </div>
      </div>
    </>
  );
}

export function PanelTrigger({
  children,
  panelContent,
  panelProps,
}: {
  children: ReactNode;
  panelContent: ReactNode;
  panelProps: Omit<ContentOverlayProps, "children" | "isOpen" | "onClose">;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setIsOpen(false);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {children}
      </button>
      <ContentOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        {...panelProps}
      >
        {panelContent}
      </ContentOverlay>
    </>
  );
}