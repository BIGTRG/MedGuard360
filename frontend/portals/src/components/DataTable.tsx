'use client';

import { cn } from '@/lib/format';

export interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  rows, columns, loading, emptyMessage = 'No results.',
  errorMessage, rowKey, onRowClick,
}: DataTableProps<T>): React.ReactElement {
  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>{columns.map(c => <th key={c.header} className={c.className}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={columns.length} className="py-6 text-center text-sm text-slate-500">Loading…</td></tr>
          )}
          {errorMessage && (
            <tr><td colSpan={columns.length} className="py-6 text-center text-sm text-red-700">{errorMessage}</td></tr>
          )}
          {!loading && !errorMessage && rows.length === 0 && (
            <tr><td colSpan={columns.length} className="py-6 text-center text-sm text-slate-500">{emptyMessage}</td></tr>
          )}
          {rows.map(row => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {columns.map(c => <td key={c.header} className={c.className}>{c.accessor(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
