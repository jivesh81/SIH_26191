"use client";

import { ReactNode, HTMLAttributes, forwardRef } from "react";

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ children, striped = true, hoverable = true, compact = false, className = "", ...props }, ref) => {
    return (
      <div className="overflow-x-auto">
        <table
          ref={ref}
          className={`w-full border-collapse ${className}`}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = "Table";

interface TheadProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const Thead = forwardRef<HTMLTableSectionElement, TheadProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <thead ref={ref} className={`bg-slate-50 ${className}`} {...props}>
        {children}
      </thead>
    );
  }
);

Thead.displayName = "Thead";

interface TbodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  striped?: boolean;
  hoverable?: boolean;
}

export const Tbody = forwardRef<HTMLTableSectionElement, TbodyProps>(
  ({ children, striped = true, hoverable = true, className = "", ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={`divide-y divide-slate-200 ${className}`}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);

Tbody.displayName = "Tbody";

interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  rowIndex?: number;
  striped?: boolean;
  hoverable?: boolean;
}

export const Tr = forwardRef<HTMLTableRowElement, TrProps>(
  ({ children, rowIndex, striped = true, hoverable = true, className = "", ...props }, ref) => {
    const rowClasses = [];
    if (striped && rowIndex !== undefined) {
      rowClasses.push(rowIndex % 2 === 0 ? "bg-slate-50" : "bg-white");
    }
    if (hoverable) {
      rowClasses.push("hover:bg-slate-50 transition-colors");
    }
    return (
      <tr ref={ref} className={`${rowClasses.join(" ")} ${className}`} {...props}>
        {children}
      </tr>
    );
  }
);

Tr.displayName = "Tr";

interface ThProps extends HTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  width?: string;
  sortable?: boolean;
  onSort?: () => void;
}

export const Th = forwardRef<HTMLTableCellElement, ThProps>(
  ({ children, align = "left", width, sortable = false, onSort, className = "", ...props }, ref) => {
    const alignClasses = {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    };

    return (
      <th
        ref={ref}
        style={{ width }}
        className={`
          px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500
          ${alignClasses[align]}
          ${sortable ? "cursor-pointer hover:text-slate-700 select-none" : ""}
          ${className}
        `}
        onClick={onSort}
        {...props}
      >
        <div className="flex items-center gap-1.5">
          {children}
          {sortable && (
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          )}
        </div>
      </th>
    );
  }
);

Th.displayName = "Th";

interface TdProps extends HTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  monospace?: boolean;
  nowrap?: boolean;
}

export const Td = forwardRef<HTMLTableCellElement, TdProps>(
  ({ children, align = "left", monospace = false, nowrap = false, className = "", ...props }, ref) => {
    const alignClasses = {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    };

    return (
      <td
        ref={ref}
        className={`
          px-4 py-3 text-sm text-slate-600
          ${alignClasses[align]}
          ${monospace ? "font-mono tabular-nums" : ""}
          ${nowrap ? "whitespace-nowrap" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </td>
    );
  }
);

Td.displayName = "Td";

interface ColumnDef<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  sortable?: boolean;
  onSort?: () => void;
  monospace?: boolean;
  nowrap?: boolean;
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyAccessor: (row: T) => string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  loading?: boolean;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyAccessor,
  striped = true,
  hoverable = true,
  compact = false,
  emptyMessage = "No data available",
  loading = false,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-left">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <Th
                key={col.key}
                align={col.align}
                width={col.width}
                sortable={col.sortable}
                onSort={col.onSort}
              >
                {col.header}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((row, rowIndex) => (
            <Tr
              key={keyAccessor(row)}
              rowIndex={rowIndex}
              striped={striped}
              hoverable={hoverable}
              className={`${rowClassName?.(row, rowIndex) || ""} ${onRowClick ? "cursor-pointer" : ""}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <Td
                  key={col.key}
                  align={col.align}
                  monospace={col.monospace}
                  nowrap={col.nowrap}
                  className={col.cellClassName}
                >
                  {col.accessor(row)}
                </Td>
              ))}
            </Tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}