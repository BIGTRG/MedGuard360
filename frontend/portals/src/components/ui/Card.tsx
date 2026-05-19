import { cn } from '@/lib/format';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Card({ className, children, title, subtitle, action }: CardProps): React.ReactElement {
  return (
    <div className={cn('card', className)}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
