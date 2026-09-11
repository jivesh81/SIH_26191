'use client';

import { useState } from 'react';
import { usePlanVersions, PlanVersion } from '@/hooks/useApi';
import { AlertCircle, CheckCircle, XCircle, Clock, RotateCcw, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface PlanVersionPanelProps {
  onApprove?: (version: number) => void;
  onReject?: (version: number) => void;
}

export function PlanVersionPanel({ onApprove, onReject }: PlanVersionPanelProps) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const versions = usePlanVersions();

  if (!versions || versions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500">
        <div className="text-3xl mb-2">📋</div>
        <p className="font-medium">No plan versions yet</p>
        <p className="text-sm">Run optimization or trigger an event to create a plan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Plan Versions ({versions.length})
        </h3>
      </div>

      <div className="space-y-2">
        {versions.map((version: any, idx: number) => (
          <VersionCard
            key={version.version}
            version={version}
            isExpanded={expandedVersion === version.version}
            onToggle={() => setExpandedVersion(expandedVersion === version.version ? null : version.version)}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
      </div>
    </div>
  );
}

interface VersionCardProps {
  version: PlanVersion;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove?: (version: number) => void;
  onReject?: (version: number) => void;
}

function VersionCard({ version, isExpanded, onToggle, onApprove, onReject }: VersionCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'invalid': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'superseded': return <Clock className="w-4 h-4 text-slate-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'invalid': return 'bg-red-100 text-red-700';
      case 'superseded': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className={`w-full p-3 flex items-center gap-3 transition-colors ${
          version.status === 'active' ? 'bg-green-50 border-l-4 border-green-500' :
          version.status === 'invalid' ? 'bg-red-50 border-l-4 border-red-500' :
          'hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-mono text-sm">
            v{version.version}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${version.status === 'active' ? 'bg-green-100 text-green-700' : version.status === 'invalid' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                {version.status === 'active' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {version.status === 'invalid' && <AlertCircle className="w-4 h-4 text-red-600" />}
                {version.status === 'superseded' && <Clock className="w-4 h-4 text-slate-500" />}
                {version.status.charAt(0).toUpperCase() + version.status.slice(1)}
              </span>
              {version.invalidation_reason && (
                <span className="text-xs text-red-600 px-2 py-0.5 bg-red-50 rounded">
                  Invalidated
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Assigned: {version.total_assigned_population?.toLocaleString() || 0}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Unmet: {version.total_unmet_population?.toLocaleString() || 0}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(version.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-3">
          {version.invalidation_reason && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium text-sm">Invalidation Reason</span>
              </div>
              <p className="text-sm text-red-600">{version.invalidation_reason}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white rounded p-2">
              <span className="text-slate-500">Affected Assignments</span>
              <div className="font-mono text-slate-700">{version.affected_assignments?.length || 0}</div>
            </div>
            <div className="bg-white rounded p-2">
              <span className="text-slate-500">Affected Sites</span>
              <div className="font-mono text-slate-700">{version.affected_sites?.length || 0}</div>
            </div>
            <div className="bg-white rounded p-2">
              <span className="text-slate-500">Affected Routes</span>
              <div className="font-mono text-slate-700">{version.affected_routes?.length || 0}</div>
            </div>
            <div className="bg-white rounded p-2">
              <span className="text-slate-500">Optimization Status</span>
              <div className="font-mono text-slate-700 capitalize">{version.optimization_status}</div>
            </div>
          </div>

          {version.affected_assignments && version.affected_assignments.length > 0 && (
            <div className="bg-white rounded p-2">
              <span className="text-xs text-slate-500">Affected Habitations:</span>
              <div className="text-xs text-slate-700 font-mono mt-1">{version.affected_assignments.join(', ')}</div>
            </div>
          )}

          {version.affected_routes && version.affected_routes.length > 0 && (
            <div className="bg-white rounded p-2">
              <span className="text-xs text-slate-500">Affected Routes:</span>
              <div className="text-xs text-slate-700 font-mono">{version.affected_routes.join(', ')}</div>
            </div>
          )}

          {version.affected_sites && version.affected_sites.length > 0 && (
            <div className="bg-white rounded p-2">
              <span className="text-xs text-slate-500">Affected Sites:</span>
              <div className="text-xs text-slate-700 font-mono">{version.affected_sites.join(', ')}</div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <button
              onClick={() => onApprove?.(version.version)}
              disabled={version.status !== 'active'}
              className="flex-1 py-1.5 px-3 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve Plan
            </button>
            <button
              onClick={() => onReject?.(version.version)}
              disabled={version.status !== 'active'}
              className="flex-1 py-1.5 px-3 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject Plan
            </button>
            <button
              onClick={() => onApprove?.(version.version)}
              disabled={version.status !== 'active'}
              className="flex-1 py-1.5 px-3 bg-aapda-600 text-white text-xs font-medium rounded hover:bg-aapda-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-optimize
            </button>
          </div>
        </div>
      )}
    </div>
  );
}