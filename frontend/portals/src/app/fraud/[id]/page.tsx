'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Legacy route — NC demo uses /fraud/cases/[id] for timeline + escalation. */
export default function FraudCaseLegacyRedirect(): null {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.id) router.replace(`/fraud/cases/${params.id}`);
  }, [params.id, router]);

  return null;
}
