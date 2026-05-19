import { cn } from '@/lib/format';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps): React.ReactElement {
  const variants = {
    default: 'badge-gray',
    success: 'badge-green',
    warning: 'badge-yellow',
    danger:  'badge-red',
    info:    'badge-blue',
  };

  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  );
}
