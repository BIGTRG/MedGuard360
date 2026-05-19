import { cn } from '@/lib/format';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/20/solid';

interface KpiProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

export function Kpi({ label, value, delta, hint, tone = 'default' }: KpiProps): React.ReactElement {
  return (
    <div className="kpi-card">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className={cn(
          'text-2xl font-semibold',
          tone === 'success' && 'text-green-700',
          tone === 'warning' && 'text-amber-700',
          tone === 'danger'  && 'text-red-700',
          tone === 'default' && 'text-slate-900',
        )}>{value}</span>
        {delta && (
          <span className={cn(
            'inline-flex items-center text-xs font-medium',
            delta.positive === false ? 'text-red-700' : 'text-green-700',
          )}>
            {delta.positive === false
              ? <ArrowTrendingDownIcon className="h-3 w-3" />
              : <ArrowTrendingUpIcon className="h-3 w-3" />}
            {delta.value}
          </span>
        )}
      </div>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
}
