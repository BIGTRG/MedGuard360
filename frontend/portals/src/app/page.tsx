'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { getCurrentClaims, homePathForRole } from '@/lib/auth';

export default function RootPage(): React.ReactElement {
  const router = useRouter();

  useEffect(() => {
    // DEMO BYPASS: jump straight into admin dashboard.
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center">
      <div className="max-w-lg mx-auto text-center text-white p-8">
        <div className="mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-brand-700 font-bold text-2xl">MG</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">MedGuard360</h1>
          <p className="text-brand-200 text-lg">AI-Assisted Medicaid Fraud Prevention</p>
        </div>
        <p className="text-brand-100 mb-8">
          The first platform that prevents Medicaid fraud before it happens — not after payment.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-white text-brand-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
