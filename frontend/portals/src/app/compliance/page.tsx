'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheckIcon, DocumentMagnifyingGlassIcon, ClockIcon, ExclamationTriangleIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { timeSince } from '@/lib/format';

interface AuditRow {
  id: string;
  occurred_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  resource: string;
  resource_id: string;
  action: string;
  outcome: string;
  context: Record<string, unknown>;
}

interface NotificationLogRow {
  id: string;
  channel: 'email' | 'sms' | 'push';
  template_key: string | null;
  subject: string | null;
  body: string;
  status: string;
  sent_at: string;
}

function describeEvent(row: AuditRow): string {
  const ctx = row.context ?? {};
  if (row.resource === 'patient' && row.action === 'read') {
    const n = ctx.records ?? ctx.reason;
    return `PHI access — ${n ? `${n} — ` : ''}${row.resource} ${row.resource_id.slice(0, 8)}…`;
  }
  if (row.resource === 'claim' && row.action === 'export') {
    return `Bulk claim download — ${ctx.count ?? '?'} claims`;
  }
  if (row.resource === 'pa_request' && row.action === 'update') {
    return `PA decision override — specialist overrode AI on criterion`;
  }
  if (row.action === 'login' && row.outcome === 'denied') {
    return `Failed login attempts (${ctx.attempts ?? 'multiple'})`;
  }
  if (row.resource === 'fraud_case') {
    return `Fraud case ${String(ctx.action ?? row.action)} — ${String(ctx.target ?? row.resource_id.slice(0, 8))}`;
  }
  return `${row.action} ${row.resource} — ${row.resource_id.slice(0, 8)}…`;
}

function ComplianceInner(): React.ReactElement {
  const [events, setEvents] = useState<AuditRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ rows: AuditRow[] }>('/v1/audit/search?limit=10'),
      api.get<{ logs: NotificationLogRow[] }>('/v1/notifications/logs?limit=6'),
    ])
      .then(([audit, notifs]) => {
        setEvents(audit.rows);
        setNotifications(notifs.logs);
      })
      .catch(() => {
        setEvents([]);
        setNotifications([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const flagged = events.filter(e => e.outcome === 'denied' || e.action === 'export' || e.resource === 'pa_request');

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <ShieldCheckIcon className="h-5 w-5" /> Compliance Officer
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <dt className="text-xs text-slate-500">PHI events (sample)</dt>
          <dd className="text-2xl font-semibold">{events.filter(e => e.resource === 'patient').length || '—'}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <dt className="text-xs text-slate-500">Flagged in feed</dt>
          <dd className="text-2xl font-semibold text-amber-700">{flagged.length}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <dt className="text-xs text-slate-500">BAAs current</dt>
          <dd className="text-2xl font-semibold">7/8</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <dt className="text-xs text-slate-500">Breaches (12mo)</dt>
          <dd className="text-2xl font-semibold text-green-700">0</dd>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <DocumentMagnifyingGlassIcon className="h-4 w-4" /> Recent PHI access events
          </h3>
          <Link href="/audit" className="text-xs text-brand-700 underline">Full audit search</Link>
        </div>
        {loading && <p className="text-sm text-slate-500">Loading audit feed…</p>}
        {!loading && events.length === 0 && (
          <p className="text-sm text-slate-500">No audit events — re-run <code>deploy/seed-demo.sql</code>.</p>
        )}
        <ul className="space-y-2 text-sm">
          {events.map(row => {
            const flag = row.outcome === 'denied' || row.action === 'export' || row.resource === 'pa_request';
            return (
              <li key={row.id} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0">
                <span className={flag ? 'text-amber-900' : 'text-slate-700'}>
                  {flag && <ExclamationTriangleIcon className="inline h-4 w-4 text-amber-600 mr-1" />}
                  {describeEvent(row)}
                </span>
                <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                  <ClockIcon className="inline h-3 w-3 mr-1" />
                  {timeSince(row.occurred_at)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <BellAlertIcon className="h-4 w-4" /> Notification delivery log
          </h3>
          <span className="text-xs text-slate-500">SES / Twilio / FCM stub mode in demo</span>
        </div>
        {loading && <p className="text-sm text-slate-500">Loading notification log…</p>}
        {!loading && notifications.length === 0 && (
          <p className="text-sm text-slate-500">No notification logs — apply migration 0036 and re-seed.</p>
        )}
        <ul className="space-y-2 text-sm">
          {notifications.map(row => (
            <li key={row.id} className="flex justify-between items-start border-b border-slate-100 pb-2 last:border-0">
              <span className="text-slate-700">
                <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase">{row.channel}</span>
                {row.subject ?? row.template_key ?? row.body.slice(0, 60)}
              </span>
              <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                <ClockIcon className="inline h-3 w-3 mr-1" />
                {timeSince(row.sent_at)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold mb-2">HIPAA SRA status</h3>
          <p className="text-sm text-slate-600">Annual risk assessment in progress with Coalfire. Week 3 of 8.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold mb-2">SOC 2 Type II</h3>
          <p className="text-sm text-slate-600">Observation period started 2026-05-23. Final report due Week 25.</p>
        </div>
      </div>
    </div>
  );
}

export default function CompliancePage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['compliance_officer', 'qa_auditor', 'platform_administrator', 'state_medicaid_agency']}>
      <AppShell><ComplianceInner /></AppShell>
    </AuthGate>
  );
}
