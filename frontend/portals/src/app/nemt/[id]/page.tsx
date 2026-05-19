'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MapIcon, PlayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DetailLayout, DetailSection, FieldRow } from '@/components/DetailLayout';
import { api } from '@/lib/api-client';
import { formatCurrencyCents, formatDateTime } from '@/lib/format';

interface Trip {
  id: string; patient_id: string; broker_id: string; driver_id: string | null;
  trip_type: string; pickup_address: string; destination_address: string;
  pickup_latitude: string | null; pickup_longitude: string | null;
  destination_latitude: string | null; destination_longitude: string | null;
  scheduled_pickup_at: string; actual_pickup_at: string | null; actual_dropoff_at: string | null;
  miles_billed: string | null; total_charge_cents: string | null;
  status: string; gps_track: Array<{ lat: number; lng: number; t: string }> | null;
  state_code: string;
}

function NemtTripInner(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const [t, setT] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<Trip>(`/v1/nemt/trips/${id}`)
      .then(setT).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const start = async (): Promise<void> => {
    const driverId = prompt('Driver UUID:'); if (!driverId) return;
    setBusy(true); setError(null);
    try {
      const updated = await api.post<Trip>(`/v1/nemt/trips/${id}/start`, { driverId });
      setT(updated);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const complete = async (): Promise<void> => {
    if (!t) return;
    setBusy(true); setError(null);
    try {
      // Mock GPS track — production uses the driver app's real track
      const now = Date.now();
      const track = (t.gps_track ?? Array.from({ length: 6 }, (_, i) => ({
        lat: 35.78 + i * 0.01, lng: -78.64 - i * 0.01,
        t: new Date(now - (6 - i) * 60000).toISOString(),
      })));
      const r = await api.post<{ trip: Trip }>(`/v1/nemt/trips/${id}/complete`, {
        driverId: t.driver_id ?? '00000000-0000-0000-0000-000000000000',
        track, ratePerMileCents: 175, baseChargeCents: 300,
      });
      setT(r.trip);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (!t) return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error ?? 'Not found'}</div>;

  const statusBadge = t.status === 'completed' ? 'badge-green'
    : t.status === 'en_route' ? 'badge-yellow'
    : t.status === 'no_show' || t.status === 'cancelled' ? 'badge-red' : 'badge-blue';

  // Inflation ratio (anti-fraud)
  let gpsMiles = 0, straightMiles = 0, ratio = 0;
  if (t.gps_track && t.gps_track.length > 1) {
    const R = 3958.7613;
    const toRad = (d: number) => (d * Math.PI) / 180;
    for (let i = 1; i < t.gps_track.length; i++) {
      const a = t.gps_track[i - 1], b = t.gps_track[i];
      const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng);
      const h = Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
      gpsMiles += 2 * R * Math.asin(Math.sqrt(h));
    }
    if (t.pickup_latitude && t.destination_latitude && t.pickup_longitude && t.destination_longitude) {
      const dLat = toRad(Number(t.destination_latitude) - Number(t.pickup_latitude));
      const dLng = toRad(Number(t.destination_longitude) - Number(t.pickup_longitude));
      const h = Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 * Math.cos(toRad(Number(t.pickup_latitude))) * Math.cos(toRad(Number(t.destination_latitude)));
      straightMiles = 2 * R * Math.asin(Math.sqrt(h));
    }
    ratio = straightMiles > 0 ? gpsMiles / straightMiles : 0;
  }

  return (
    <DetailLayout
      title="NEMT Trip"
      subtitle={<span className="font-mono text-xs">{t.id}</span>}
      backHref="/nemt"
      badges={<>
        <span className={statusBadge}>{t.status.replace('_', ' ')}</span>
        <span className="badge-gray">{t.trip_type}</span>
        <span className="badge-gray">{t.state_code}</span>
        {ratio > 1.5 && <span className="badge-red">Inflation {ratio.toFixed(2)}×</span>}
      </>}
      actions={<>
        {t.status === 'scheduled' && <button className="btn-primary" disabled={busy} onClick={start}><PlayIcon className="h-4 w-4" /> Start trip</button>}
        {t.status === 'en_route' && <button className="btn-primary" disabled={busy} onClick={complete}><CheckCircleIcon className="h-4 w-4" /> Complete</button>}
      </>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DetailSection title="Pickup">
          <dl>
            <FieldRow label="Address">{t.pickup_address}</FieldRow>
            <FieldRow label="Coordinates">{t.pickup_latitude ?? '—'}, {t.pickup_longitude ?? '—'}</FieldRow>
            <FieldRow label="Scheduled">{formatDateTime(t.scheduled_pickup_at)}</FieldRow>
            <FieldRow label="Actual">{formatDateTime(t.actual_pickup_at)}</FieldRow>
          </dl>
        </DetailSection>
        <DetailSection title="Destination">
          <dl>
            <FieldRow label="Address">{t.destination_address}</FieldRow>
            <FieldRow label="Coordinates">{t.destination_latitude ?? '—'}, {t.destination_longitude ?? '—'}</FieldRow>
            <FieldRow label="Drop-off">{formatDateTime(t.actual_dropoff_at)}</FieldRow>
          </dl>
        </DetailSection>
        <DetailSection title="Billing">
          <dl>
            <FieldRow label="GPS miles">{gpsMiles ? gpsMiles.toFixed(1) : '—'}</FieldRow>
            <FieldRow label="Straight-line miles">{straightMiles ? straightMiles.toFixed(1) : '—'}</FieldRow>
            <FieldRow label="Inflation ratio">{ratio ? ratio.toFixed(2) : '—'}</FieldRow>
            <FieldRow label="Miles billed">{t.miles_billed ?? '—'}</FieldRow>
            <FieldRow label="Charge">{formatCurrencyCents(t.total_charge_cents)}</FieldRow>
          </dl>
        </DetailSection>
        <DetailSection title="Roster">
          <dl>
            <FieldRow label="Patient">  <span className="font-mono text-xs">{t.patient_id.slice(0, 8)}…</span></FieldRow>
            <FieldRow label="Broker">   <span className="font-mono text-xs">{t.broker_id.slice(0, 8)}…</span></FieldRow>
            <FieldRow label="Driver">   {t.driver_id ? <span className="font-mono text-xs">{t.driver_id.slice(0, 8)}…</span> : '—'}</FieldRow>
          </dl>
        </DetailSection>
      </div>
      {ratio > 1.5 && (
        <div className="card card-body bg-red-50 text-sm text-red-900">
          <MapIcon className="h-5 w-5 text-red-600" />
          <strong>Fraud signal:</strong> GPS track is {ratio.toFixed(1)}× longer than point-to-point distance.
          A fraud-engine alert will be raised on `nemt.trip.completed`.
        </div>
      )}
    </DetailLayout>
  );
}

export default function NemtTripPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['nemt_broker','platform_administrator','fraud_investigator','state_medicaid_agency']}>
      <AppShell><NemtTripInner /></AppShell>
    </AuthGate>
  );
}
