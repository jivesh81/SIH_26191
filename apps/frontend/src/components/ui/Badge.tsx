"use client";

import { HTMLAttributes, forwardRef } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"
    | "pending"
    | "active"
    | "inactive"
    | "approved"
    | "rejected"
    | "superseded"
    | "draft";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  dotColor?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = "default",
      size = "md",
      dot = false,
      dotColor,
      className = "",
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: "bg-slate-100 text-slate-700 border-slate-200",
      success: "bg-green-50 text-green-700 border-green-200",
      warning: "bg-amber-50 text-amber-700 border-amber-200",
      danger: "bg-red-50 text-red-700 border-red-200",
      info: "bg-blue-50 text-blue-700 border-blue-200",
      neutral: "bg-slate-100 text-slate-700 border-slate-200",
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      active: "bg-blue-50 text-blue-700 border-blue-200",
      inactive: "bg-slate-100 text-slate-600 border-slate-200",
      approved: "bg-green-50 text-green-700 border-green-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
      superseded: "bg-slate-100 text-slate-600 border-slate-200",
      draft: "bg-slate-100 text-slate-600 border-slate-200",
    };
    const sizeClasses = {
      sm: "px-2 py-0.5 text-[10px]",
      md: "px-2.5 py-1 text-xs",
      lg: "px-3 py-1.5 text-sm",
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {dot && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor || "currentColor" }}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status:
    | "pending"
    | "active"
    | "approved"
    | "rejected"
    | "inactive"
    | "superseded"
    | "draft"
    | "critical"
    | "warning"
    | "success"
    | "info";
  size?: "sm" | "md";
  showDot?: boolean;
}

const statusConfig = {
  pending: { variant: "pending" as const, label: "PENDING" },
  active: { variant: "active" as const, label: "ACTIVE" },
  approved: { variant: "approved" as const, label: "APPROVED" },
  rejected: { variant: "rejected" as const, label: "REJECTED" },
  inactive: { variant: "inactive" as const, label: "INACTIVE" },
  superseded: { variant: "superseded" as const, label: "SUPERSEDED" },
  draft: { variant: "draft" as const, label: "DRAFT" },
  critical: { variant: "danger" as const, label: "CRITICAL" },
  warning: { variant: "warning" as const, label: "WARNING" },
  success: { variant: "success" as const, label: "SUCCESS" },
  info: { variant: "info" as const, label: "INFO" },
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, size = "md", showDot = true, className = "", ...props }, ref) => {
    const config = statusConfig[status] || statusConfig.info;
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        size={size}
        dot={showDot}
        className={`tracking-wide ${className}`}
        {...props}
      >
        {config.label}
      </Badge>
    );
  }
);

StatusBadge.displayName = "StatusBadge";