'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/format';

interface DetailLayoutProps {
  title: string;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  backHref?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function DetailLayout({
  title, subtitle, badges, backHref, actions, children,
}: DetailLayoutProps): React.ReactElement {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => (backHref ? router.push(backHref) : router.back())}
            className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" /> Back
          </button>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
          {badges && <div className="mt-2 flex flex-wrap gap-2">{badges}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function DetailSection({
  title, children, className,
}: { title: string; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <div className={cn('card', className)}>
      <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">{title}</div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between border-b border-slate-100 py-2 text-sm last:border-b-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}
