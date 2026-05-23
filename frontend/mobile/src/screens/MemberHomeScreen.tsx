/**
 * Patient/member-facing home screen for the MedGuard360 mobile app.
 *
 * Offline-first: hydrates from SQLite cache, refreshes from API in the background.
 * Biometric gate at app launch; biometric required again for crisis activation,
 * PHI export, and any state change to crisis plan or eligibility.
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { apiFetch } from '../lib/api';
import { getSqlite } from '../lib/db';
import { useAuth } from '../context/AuthContext';

interface Coverage { plan_name: string; active: boolean; copay_cents: number; effective_from: string; }
interface Claim { claim_control_number: string; service_from: string; total_charge_cents: number; status: string; }
interface PA { service_code: string; service_description: string | null; status: string; due_at: string; }

export default function MemberHomeScreen({ navigation }: { navigation: any }): React.ReactElement {
  const { user } = useAuth();
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [pas, setPas] = useState<PA[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load(): Promise<void> {
    // Hydrate from cache first
    try {
      const db = await getSqlite();
      const c = await db.executeSql('SELECT data FROM kv WHERE key = ?', ['member:coverage']);
      if (c[0].rows.length > 0) setCoverage(JSON.parse(c[0].rows.item(0).data));
    } catch {}
    // Refresh from API
    try {
      const data = await apiFetch<{ coverage: Coverage; claims: Claim[]; pas: PA[] }>('/v1/patient/me/summary');
      setCoverage(data.coverage); setClaims(data.claims); setPas(data.pas);
      const db = await getSqlite();
      await db.executeSql('INSERT OR REPLACE INTO kv(key,data) VALUES (?, ?)', ['member:coverage', JSON.stringify(data.coverage)]);
    } catch (e) { /* offline; show cached */ }
  }

  useEffect(() => { load(); }, []);

  async function onRefresh(): Promise<void> {
    setRefreshing(true); await load(); setRefreshing(false);
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome back{user?.firstName ? ', ' + user.firstName : ''}</Text>
        {coverage && <Text style={styles.subtitle}>{coverage.plan_name} {coverage.active ? '· active' : '· inactive'}</Text>}
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity style={[styles.quickBtn, styles.quickPrimary]} onPress={() => navigation.navigate('Biometric')}>
          <Text style={styles.quickText}>Biometric ID</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('RequestRefill')}>
          <Text style={styles.quickText}>Refill</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('BookRide')}>
          <Text style={styles.quickText}>Ride</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickBtn, styles.quickCrisis]} onPress={() => navigation.navigate('Crisis')}>
          <Text style={[styles.quickText, { color: '#fff' }]}>Crisis</Text>
        </TouchableOpacity>
      </View>

      {coverage && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coverage</Text>
          <Text style={styles.row}><Text style={styles.label}>Plan: </Text>{coverage.plan_name}</Text>
          <Text style={styles.row}><Text style={styles.label}>Copay: </Text>${(coverage.copay_cents / 100).toFixed(2)}</Text>
          <Text style={styles.row}><Text style={styles.label}>Effective: </Text>{coverage.effective_from}</Text>
        </View>
      )}

      {pas.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prior Authorizations</Text>
          {pas.slice(0, 3).map(p => (
            <View key={p.service_code} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowMain}>{p.service_description ?? p.service_code}</Text>
                <Text style={styles.rowMeta}>Due {new Date(p.due_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.statusBadge}>{p.status}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Claims</Text>
        {claims.length === 0 ? <Text style={styles.empty}>No recent claims.</Text> :
          claims.slice(0, 5).map(c => (
            <View key={c.claim_control_number} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowMain}>${(c.total_charge_cents / 100).toFixed(2)}</Text>
                <Text style={styles.rowMeta}>{c.service_from} · {c.claim_control_number}</Text>
              </View>
              <Text style={styles.statusBadge}>{c.status}</Text>
            </View>
          ))}
      </View>

      <View style={[styles.card, styles.crisisCard]}>
        <Text style={[styles.cardTitle, { color: '#b91c1c' }]}>If you need help right now</Text>
        <Text style={styles.crisisLine}>Call 988 (Suicide &amp; Crisis Lifeline)</Text>
        <Text style={styles.crisisLine}>Or NC Hub: 1-833-870-5500</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 12 },
  welcome: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  quickRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  quickBtn: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  quickPrimary: { borderColor: '#0ea5e9' },
  quickCrisis: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  quickText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  card: { margin: 16, marginTop: 12, backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  crisisCard: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 10 },
  row: { fontSize: 14, color: '#334155', marginVertical: 2 },
  label: { color: '#64748b' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowMain: { fontSize: 14, fontWeight: '500', color: '#0f172a' },
  rowMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { fontSize: 11, color: '#0c4a6e', backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  empty: { fontSize: 13, color: '#64748b', fontStyle: 'italic' },
  crisisLine: { fontSize: 15, color: '#7f1d1d', marginVertical: 4 },
});
