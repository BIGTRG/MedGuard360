import { cn } from '@/lib/format';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
}

export function StatCard({ label, value, subtext, color = 'default', icon }: StatCardProps): React.ReactElement {
  const iconColors = {
    default: 'text-brand-600 bg-brand-50',
    success: 'text-green-600 bg-green-50',
    warning: 'text-amber-600 bg-amber-50',
    danger:  'text-red-600 bg-red-50',
  };

  const valueColors = {
    default: 'text-slate-900',
    success: 'text-green-700',
    warning: 'text-amber-700',
    danger:  'text-red-700',
  };

  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        {icon && (
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', iconColors[color])}>
            {icon}
          </div>
        )}
      </div>
      <span className={cn('text-2xl font-semibold', valueColors[color])}>{value}</span>
      {subtext && <span className="text-xs text-slate-500 mt-0.5">{subtext}</span>}
    </div>
  );
}
