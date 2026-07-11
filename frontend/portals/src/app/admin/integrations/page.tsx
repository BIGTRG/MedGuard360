'use client';

import { Fragment, useState } from 'react';
import { CircleStackIcon, CheckCircleIcon, ExclamationTriangleIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

interface Adapter {
  key: string;
  vendor: string;
  purpose: string;
  envMode: string;
  modes: string[];
  envVars: string[];
  status: 'stub' | 'live' | 'partial';
  spec: string;
}

const ADAPTERS: Adapter[] = [
  {
    key: 'nctracks', vendor: 'NCTracks (Gainwell/GDIT — NC MMIS)',
    purpose: 'Eligibility 270/271 + claim submit 837P — wired to eligibility-service + claims-service (NC)',
    envMode: 'NCTRACKS_MODE', modes: ['stub','soap','sftp','live'], status: 'stub',
    envVars: ['NCTRACKS_REALTIME_ELIGIBILITY_URL','NCTRACKS_SUBMITTER_ID','NCTRACKS_TPID','NCTRACKS_RECEIVER_ID','NCTRACKS_CLIENT_CERT','NCTRACKS_CLIENT_KEY','NCTRACKS_BATCH_SFTP_HOST','NCTRACKS_BATCH_SFTP_USER','NCTRACKS_SFTP_PRIVATE_KEY','NCTRACKS_USAGE_INDICATOR'],
    spec: 'integrations/nctracks/src/',
  },
  {
    key: 'mtm', vendor: 'MTM Inc (NEMT broker)',
    purpose: 'Trip authorization, trip-claim submission, status webhooks',
    envMode: 'MTM_MODE', modes: ['stub','rest'], status: 'stub',
    envVars: ['MTM_API_BASE','MTM_CLIENT_ID','MTM_CLIENT_SECRET','MTM_WEBHOOK_HMAC_SECRET','MTM_PROVIDER_ID'],
    spec: 'integrations/nemt-brokers/',
  },
  {
    key: 'modivcare', vendor: 'ModivCare (NEMT broker, formerly LogistiCare)',
    purpose: 'Same surface as MTM; selected per Standard Plan',
    envMode: 'MODIVCARE_MODE', modes: ['stub','rest'], status: 'stub',
    envVars: ['MODIVCARE_API_BASE','MODIVCARE_CLIENT_ID','MODIVCARE_CLIENT_SECRET','MODIVCARE_WEBHOOK_HMAC_SECRET'],
    spec: 'integrations/nemt-brokers/',
  },
  {
    key: 'cgs', vendor: 'CGS Administrators (Medicare DMEPOS MAC Jurisdiction C)',
    purpose: 'Submit DMEPOS claims for NC/SC/GA + 14 other states',
    envMode: 'CGS_MODE', modes: ['stub','edi'], status: 'stub',
    envVars: ['CGS_SUBMITTER_ID','CGS_SFTP_HOST','CGS_SFTP_USER','CGS_SFTP_KEY_PATH'],
    spec: 'integrations/cms/',
  },
  {
    key: 'davinci-pas', vendor: 'HL7 FHIR R4 — Da Vinci PAS / CRD / DTR',
    purpose: 'Prior-auth submission per CMS Interoperability Final Rule (mandatory Jan 2027)',
    envMode: 'DAVINCI_PAS_MODE', modes: ['stub','fhir'], status: 'stub',
    envVars: ['DAVINCI_PAS_CLIENT_ID','DAVINCI_PAS_CLIENT_CERT_PATH','DAVINCI_PAS_CLIENT_KEY_PATH'],
    spec: 'integrations/cms/',
  },
  {
    key: 'biometric', vendor: 'Suprema / NEC (biometric)',
    purpose: 'Facial + thumbprint match for PHI export + claim submission',
    envMode: 'BIOMETRIC_VENDOR', modes: ['stub','suprema','nec'], status: 'partial',
    envVars: ['SUPREMA_API_BASE','SUPREMA_API_KEY','NEC_API_BASE','NEC_API_TOKEN','BIOMETRIC_SCORE_THRESHOLD','BIOMETRIC_LIVENESS_THRESHOLD'],
    spec: 'services/auth-service/src/biometric/',
  },
  {
    key: 'clearinghouse', vendor: 'Change Healthcare / Availity / TriZetto',
    purpose: '837P submission to commercial payers (non-NCTracks routes)',
    envMode: 'CLEARINGHOUSE', modes: ['stub','change_healthcare','availity','trizetto','generic_rest'], status: 'partial',
    envVars: ['CHANGE_HEALTHCARE_API','CHANGE_HEALTHCARE_TOKEN','AVAILITY_API','AVAILITY_TOKEN'],
    spec: 'services/claims-service/src/clearinghouse.ts',
  },
  {
    key: 'notification', vendor: 'AWS SES / Twilio / FCM',
    purpose: 'Email + SMS + push notifications (10 event templates)',
    envMode: '(per channel)', modes: ['stub','ses','twilio','fcm'], status: 'partial',
    envVars: ['SES_FROM_ADDRESS','SES_CONFIGURATION_SET','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','FCM_PROJECT_ID','FCM_CLIENT_EMAIL'],
    spec: 'services/notification-service/src/vendors.ts',
  },
];

function badge(status: Adapter['status']): React.ReactElement {
  if (status === 'live')   return <span className="badge-green"><CheckCircleIcon className="h-3.5 w-3.5 mr-1"/>live</span>;
  if (status === 'partial')return <span className="badge-yellow"><ExclamationTriangleIcon className="h-3.5 w-3.5 mr-1"/>partial</span>;
  return <span className="badge-gray"><BeakerIcon className="h-3.5 w-3.5 mr-1"/>stub</span>;
}

function IntegrationsInner(): React.ReactElement {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <CircleStackIcon className="h-5 w-5" /> External Integrations
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {ADAPTERS.length} vendor adapters. All currently in <strong>stub mode</strong> — flip to live
          by setting the mode env var + populating the credential vault. See each spec for onboarding steps.
        </p>
      </div>
      <table className="w-full table-fixed text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 px-3 w-1/4">Vendor</th>
            <th className="py-2 px-3 w-2/5">Purpose</th>
            <th className="py-2 px-3 w-1/6">Env mode</th>
            <th className="py-2 px-3 w-1/12">Status</th>
            <th className="py-2 px-3 w-1/12">Spec</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ADAPTERS.map(a => (
            <Fragment key={a.key}>
              <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(expanded === a.key ? null : a.key)}>
                <td className="py-3 px-3 font-medium text-slate-900">{a.vendor}</td>
                <td className="py-3 px-3 text-slate-700">{a.purpose}</td>
                <td className="py-3 px-3"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{a.envMode}</code><br/><span className="text-xs text-slate-500">{a.modes.join(' | ')}</span></td>
                <td className="py-3 px-3">{badge(a.status)}</td>
                <td className="py-3 px-3 font-mono text-xs text-brand-700">{a.spec}</td>
              </tr>
              {expanded === a.key && (
                <tr className="bg-slate-50">
                  <td colSpan={5} className="py-3 px-6">
                    <p className="text-xs text-slate-500 mb-1">Required env vars when leaving stub mode:</p>
                    <div className="flex flex-wrap gap-1">
                      {a.envVars.map(v => <code key={v} className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded">{v}</code>)}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        Real credentials live in <code>/opt/credential-vault/&lt;service&gt;.json</code> on the server —
        never in <code>.env</code>. The shared <code>config.ts</code> reads vault first, env second.
      </div>
    </div>
  );
}

export default function AdminIntegrationsPage(): React.ReactElement {
  return (
    <AuthGate>
      <AppShell>
        <IntegrationsInner />
      </AppShell>
    </AuthGate>
  );
}
