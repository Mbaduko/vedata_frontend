import type { ReactNode } from 'react';

interface Column<T> {
  header: string;
  accessor: string;
  align?: 'left' | 'right';
  className?: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, unknown>>({ columns, data, onRowClick, emptyMessage = 'No data found' }: DataTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <p className="text-ink-secondary text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg/50">
              {columns.map((col, index) => (
                <th key={index} className={`px-4 py-3 text-left font-medium text-ink-secondary text-xs uppercase tracking-wide ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={(row.id as string) || rowIndex}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-border last:border-b-0 ${onRowClick ? 'cursor-pointer hover:bg-bg/50' : ''}`}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={`px-4 py-3 ${col.align === 'right' ? 'text-right tabular-nums' : ''} ${col.className || ''}`}>
                    {col.render ? col.render(row) : (row[col.accessor] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
