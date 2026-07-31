'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FingerPrintIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { api, refreshAccess } from '@/lib/api-client';
import { AuthGate } from '@/components/AuthGate';

function BiometricInner(): React.ReactElement {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'scanning' | 'verified' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  const verify = async (): Promise<void> => {
    setStatus('scanning');
    setError(null);
    try {
      // In production this would call the Suprema/NEC SDK and pass the captured payload.
      // For dev the auth-service biometric endpoint accepts "PASS" base64 → success.
      const sample = typeof btoa === 'function' ? btoa('PASS') : Buffer.from('PASS').toString('base64');
      await api.post<{ verified: boolean; requiresTokenRefresh: boolean }>('/v1/auth/biometric/verify', {
        modality: 'face',
        samplePayloadBase64: sample,
      });
      // The session is now biometric-verified; force a token refresh to pick up the claim.
      await refreshAccess();
      setStatus('verified');
      setTimeout(() => router.back(), 800);
    } catch (err) {
      setStatus('failed');
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card card-body w-full max-w-md text-center">
        <FingerPrintIcon className="mx-auto h-12 w-12 text-brand-600" />
        <h1 className="mt-3 text-lg font-semibold text-slate-900">Biometric verification</h1>
        <p className="mt-1 text-sm text-slate-500">
          Required to submit claims, access full patient records, and emergency-responder data.
        </p>
        <button onClick={verify} className="btn-primary mt-4 w-full justify-center" disabled={status === 'scanning' || status === 'verified'}>
          {status === 'scanning' ? 'Scanning…' :
           status === 'verified' ? <><CheckCircleIcon className="h-4 w-4" /> Verified</> :
           'Scan now'}
        </button>
        {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      </div>
    </div>
  );
}

export default function BiometricPage(): React.ReactElement {
  return <AuthGate><BiometricInner /></AuthGate>;
}
