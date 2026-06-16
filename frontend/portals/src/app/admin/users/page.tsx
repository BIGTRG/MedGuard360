'use client';

import { UserGroupIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const DEMO_USERS = [
  { email: 'admin@demo.medguard360.com', role: 'platform_administrator', area: 'Platform admin' },
  { email: 'fraud@demo.medguard360.com', role: 'fraud_investigator', area: 'Fraud queue + escalation' },
  { email: 'pa@demo.medguard360.com', role: 'prior_auth_specialist', area: 'PA evidence matcher' },
  { email: 'provider@demo.medguard360.com', role: 'individual_provider', area: 'Clinical workflow' },
  { email: 'patient@demo.medguard360.com', role: 'patient', area: 'Member portal' },
  { email: 'compliance@demo.medguard360.com', role: 'compliance_officer', area: 'Audit / compliance' },
  { email: 'denial@demo.medguard360.com', role: 'denial_appeals_specialist', area: 'Denials + appeals' },
  { email: 'state@demo.medguard360.com', role: 'state_medicaid_agency', area: 'State dashboard' },
  { email: 'responder@demo.medguard360.com', role: 'emergency_responder', area: 'Crisis (biometric-gated)' },
];

export default function AdminUsersPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['platform_administrator']}>
      <AppShell>
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserGroupIcon className="h-5 w-5" /> Demo users
          </h2>
          <p className="text-sm text-slate-600">
            Seeded accounts for the NC DHHS laptop demo. Password for all: <code>demo-Password!1</code>
          </p>
          <table className="w-full text-sm card overflow-hidden">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Demo area</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEMO_USERS.map((u) => (
                <tr key={u.email}>
                  <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2 text-slate-600">{u.area}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AppShell>
    </AuthGate>
  );
}