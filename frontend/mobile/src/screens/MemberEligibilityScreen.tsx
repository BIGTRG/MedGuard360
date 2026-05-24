/**
 * Member-facing coverage / eligibility detail.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { apiFetch } from '../lib/api';

interface Coverage {
  active: boolean;
  plan_name: string;
  payer_id: string;
  effective_from: string;
  effective_to: string | null;
  copay_cents: number | null;
  deductible_remaining_cents: number | null;
  source: string;
  checked_at: string;
}

export default function MemberEligibilityScreen(): React.ReactElement {
  const [c, setC] = useState<Coverage | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchLatest(): Promise<void> {
    try { const data = await apiFetch<{ coverage: Coverage }>('/v1/patient/me/coverage'); setC(data.coverage); }
    catch (e) { setErr((e as Error).message); }
  }
  useEffect(() => { fetchLatest(); }, []);

  async function refresh(): Promise<void> {
    setChecking(true); setErr(null);
    try {
      const data = await apiFetch<{ coverage: Coverage }>('/v1/patient/me/coverage?refresh=1', { method: 'POST' });
      setC(data.coverage);
    } catch (e) { setErr((e as Error).message); }
    finally { setChecking(false); }
  }

  if (!c) return <View style={styles.center}><Text>Loading…</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Coverage</Text>
        <Text style={[styles.heroStatus, c.active ? styles.active : styles.inactive]}>
          {c.active ? '✓ Active' : '✗ Inactive'}
        </Text>
      </View>

      <View style={styles.card}>
        <Row label="Plan"            value={c.plan_name} />
        <Row label="Payer ID"        value={c.payer_id} mono />
        <Row label="Effective from"  value={c.effective_from} />
        {c.effective_to && <Row label="Effective to" value={c.effective_to} />}
        <Row label="Copay"           value={c.copay_cents === null ? '—' : `$${(c.copay_cents / 100).toFixed(2)}`} />
        <Row label="Deductible left" value={c.deductible_remaining_cents === null ? '—' : `$${(c.deductible_remaining_cents / 100).toFixed(2)}`} />
        <Row label="Source"          value={c.source} />
        <Row label="Last checked"    value={new Date(c.checked_at).toLocaleString()} />
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={refresh} disabled={checking}>
        <Text style={styles.refreshText}>{checking ? 'Checking…' : 'Re-verify coverage'}</Text>
      </TouchableOpacity>

      {err && <Text style={styles.err}>{err}</Text>}

      <Text style={styles.fineprint}>
        Coverage data refreshed via NCTracks 270/271 eligibility check. Cache TTL: 24 hours.
        If your plan changed recently, tap re-verify to query live.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { padding: 24, backgroundColor: '#0c4a6e' },
  heroTitle: { color: '#fff', fontSize: 14, opacity: 0.8 },
  heroStatus: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 },
  active: { color: '#86efac' },
  inactive: { color: '#fecaca' },
  card: { backgroundColor: '#fff', margin: 16, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { color: '#64748b', fontSize: 13 },
  value: { color: '#0f172a', fontSize: 14, fontWeight: '500' },
  mono: { fontFamily: 'Courier' },
  refreshBtn: { marginHorizontal: 16, backgroundColor: '#0ea5e9', padding: 14, borderRadius: 10, alignItems: 'center' },
  refreshText: { color: '#fff', fontWeight: '600' },
  err: { padding: 16, color: '#991b1b' },
  fineprint: { padding: 20, color: '#64748b', fontSize: 11, lineHeight: 16 },
});
