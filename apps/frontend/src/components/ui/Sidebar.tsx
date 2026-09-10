'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface SidebarProps {
  children: React.ReactNode;
  position?: 'left' | 'right';
  defaultOpen?: boolean;
  width?: number;
}

export function Sidebar({ children, position = 'left', defaultOpen = true, width = 320 }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsOpen(false);
      } else {
        setIsOpen(defaultOpen);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [defaultOpen]);

  const toggle = () => setIsOpen(!isOpen);

  if (position === 'right') {
    return (
      <>
        <button
          ref={toggleRef}
          onClick={toggle}
          className="fixed right-4 top-20 z-30 p-2 bg-white rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors sm:hidden"
          aria-label={isOpen ? 'Close panel' : 'Open panel'}
          aria-expanded={isOpen}
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M9 5l7 7-7 7"} />
          </svg>
        </button>
        <aside
          ref={sidebarRef}
          className={`fixed right-0 top-14 bottom-0 z-20 bg-white border-l border-slate-200 shadow-xl transition-transform duration-300 ease-in-out sm:relative sm:top-0 sm:bottom-auto sm:shadow-none ${isOpen ? 'translate-x-0' : 'translate-x-full'} sm:translate-x-0`}
          style={{ width: `${width}px` }}
          aria-label="Detail panel"
        >
          <div className="flex items-center justify-between p-3 border-b border-slate-200 sm:hidden">
            <h2 className="font-medium text-slate-900">Details</h2>
            <button onClick={toggle} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="h-full overflow-y-auto">{children}</div>
        </aside>
        {isOpen && window.innerWidth < 768 && (
          <div className="fixed inset-0 z-10 bg-black/20 sm:hidden" onClick={toggle} aria-hidden="true" />
        )}
      </>
    );
  }

  return (
    <>
      <button
        ref={toggleRef}
        onClick={toggle}
        className="fixed left-4 top-20 z-30 p-2 bg-white rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors sm:hidden"
        aria-label={isOpen ? 'Close panel' : 'Open panel'}
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M9 5l7 7-7 7"} />
        </svg>
      </button>
      <aside
        ref={sidebarRef}
        className={`fixed left-0 top-14 bottom-0 z-20 bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 ease-in-out sm:relative sm:top-0 sm:bottom-auto sm:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0`}
        style={{ width: `${width}px` }}
        aria-label="Control panel"
      >
        <div className="flex items-center justify-between p-3 border-b border-slate-200 sm:hidden">
          <h2 className="font-medium text-slate-900">Controls</h2>
          <button onClick={toggle} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="h-full overflow-y-auto">{children}</div>
      </aside>
      {isOpen && window.innerWidth < 768 && (
        <div className="fixed inset-0 z-10 bg-black/20 sm:hidden" onClick={toggle} aria-hidden="true" />
      )}
    </>
  );
}