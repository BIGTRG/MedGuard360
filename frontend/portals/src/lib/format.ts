export function formatCurrencyCents(cents: number | string | null | undefined): string {
  if (cents == null) return '—';
  const n = typeof cents === 'string' ? Number.parseInt(cents, 10) : cents;
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / 100);
}

export function formatNumber(n: number | string | null | undefined): string {
  if (n == null) return '—';
  const v = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US').format(v);
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleString('en-US', { dateStyle: 'medium' });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export function timeSince(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  const seconds = Math.max(0, (Date.now() - dt.getTime()) / 1000);
  if (seconds < 60)        return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600)      return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)     return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800)    return `${Math.floor(seconds / 86400)}d ago`;
  return dt.toLocaleDateString('en-US', { dateStyle: 'medium' });
}

export function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}
