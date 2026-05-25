/**
 * Crisis activation flow — biometric-gated, GPS-dispatched, sub-3-second responder access.
 *
 * Flow:
 *  1. Show big red button + crisis plan summary
 *  2. User taps "ACTIVATE" → biometric prompt
 *  3. POST /v1/crisis/alerts with GPS coords
 *  4. Show: "Help dispatched" + responder ETA + 988 + 911 fallback buttons
 *  5. Crisis plan auto-shared with assigned responder via biometric-token URL
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '../lib/api';
import { promptBiometric } from '../lib/auth';

interface CrisisPlan {
  warning_signs: string[];
  coping_strategies: string[];
  emergency_contacts: { name: string; phone: string }[];
  professional_supports: { name: string; phone: string }[];
}

type State = 'idle' | 'verifying' | 'dispatching' | 'dispatched' | 'error';

export default function CrisisActivationScreen(): React.ReactElement {
  const [plan, setPlan]   = useState<CrisisPlan | null>(null);
  const [state, setState] = useState<State>('idle');
  const [alertId, setAlertId] = useState<string | null>(null);
  const [eta, setEta]     = useState<string | null>(null);
  const [err, setErr]     = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ plan: CrisisPlan }>('/v1/patient/me/crisis-plan')
      .then(d => setPlan(d.plan))
      .catch(() => {});
  }, []);

  async function activate(): Promise<void> {
    setErr(null); setState('verifying');
    const ok = await promptBiometric('Confirm crisis activation');
    if (!ok) { setState('idle'); return; }

    setState('dispatching');
    let coords: { lat: number; lng: number } | null = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    } catch {}

    try {
      const res = await apiFetch<{ alertId: string; eta: string }>('/v1/crisis/alerts', {
        method: 'POST',
        body: { source: 'self_reported', severity: 'high', gps: coords },
      });
      setAlertId(res.alertId); setEta(res.eta); setState('dispatched');
    } catch (e) {
      setErr((e as Error).message); setState('error');
    }
  }

  function call988(): void { Linking.openURL('tel:988'); }
  function call911(): void { Linking.openURL('tel:911'); }

  return (
    <ScrollView style={styles.c}>
      {state === 'idle' && (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Crisis activation</Text>
            <Text style={styles.heroSub}>
              Tap the button below if you're in crisis. We'll verify your identity
              and dispatch a responder. Your crisis plan goes with them.
            </Text>
          </View>
          <TouchableOpacity onPress={activate} style={styles.bigBtn}>
            <Text style={styles.bigBtnText}>ACTIVATE</Text>
            <Text style={styles.bigBtnSub}>Biometric verification required</Text>
          </TouchableOpacity>
          <View style={styles.row2}>
            <TouchableOpacity onPress={call988} style={styles.altBtn}>
              <Text style={styles.altBtnTitle}>Call 988</Text>
              <Text style={styles.altBtnSub}>Suicide &amp; Crisis Lifeline</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={call911} style={styles.altBtn}>
              <Text style={styles.altBtnTitle}>Call 911</Text>
              <Text style={styles.altBtnSub}>Emergency services</Text>
            </TouchableOpacity>
          </View>
          {plan && (
            <View style={styles.planCard}>
              <Text style={styles.planTitle}>Your crisis plan</Text>
              <Section title="Warning signs" items={plan.warning_signs} />
              <Section title="Coping strategies" items={plan.coping_strategies} />
              <Section title="Emergency contacts" items={plan.emergency_contacts.map(c => `${c.name} · ${c.phone}`)} />
            </View>
          )}
        </>
      )}

      {state === 'verifying'   && <Center text="Verifying identity…" />}
      {state === 'dispatching' && <Center text="Dispatching responder…" />}
      {state === 'dispatched'  && (
        <View style={[styles.hero, { backgroundColor: '#15803d' }]}>
          <Text style={styles.heroTitle}>✓ Help dispatched</Text>
          <Text style={styles.heroSub}>Alert ID: {alertId}</Text>
          {eta && <Text style={[styles.heroSub, { fontSize: 18, marginTop: 12 }]}>ETA: {eta}</Text>}
          <Text style={[styles.heroSub, { marginTop: 16 }]}>
            A licensed responder is on their way. Your crisis plan has been shared with them.
          </Text>
          <View style={styles.row2}>
            <TouchableOpacity onPress={call988} style={styles.altBtnLight}><Text style={styles.altBtnTitle}>Call 988</Text></TouchableOpacity>
            <TouchableOpacity onPress={call911} style={styles.altBtnLight}><Text style={styles.altBtnTitle}>Call 911</Text></TouchableOpacity>
          </View>
        </View>
      )}
      {state === 'error' && (
        <View style={styles.errCard}>
          <Text style={styles.errTitle}>Could not dispatch</Text>
          <Text style={styles.errBody}>{err ?? 'Unknown error'}</Text>
          <Text style={styles.errBody}>Call 988 or 911 directly.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Center({ text }: { text: string }) {
  return <View style={styles.center}><Text style={styles.centerText}>{text}</Text></View>;
}

function Section({ title, items }: { title: string; items: string[] }): React.ReactElement {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((s, i) => <Text key={i} style={styles.sectionItem}>• {s}</Text>)}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#fef2f2' },
  hero: { padding: 24, backgroundColor: '#dc2626' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '700' },
  heroSub: { color: '#fee2e2', fontSize: 14, marginTop: 8, lineHeight: 20 },
  bigBtn: { margin: 24, marginTop: 32, backgroundColor: '#b91c1c', padding: 40, borderRadius: 16, alignItems: 'center' },
  bigBtnText: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: 2 },
  bigBtnSub: { color: '#fecaca', fontSize: 12, marginTop: 6 },
  row2: { flexDirection: 'row', marginHorizontal: 16, gap: 12 },
  altBtn: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', alignItems: 'center' },
  altBtnLight: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  altBtnTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  altBtnSub: { fontSize: 11, color: '#64748b', marginTop: 4 },
  planCard: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' },
  planTitle: { fontSize: 16, fontWeight: '700', color: '#7f1d1d' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#7f1d1d' },
  sectionItem: { fontSize: 13, color: '#0f172a', marginTop: 4, paddingLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  centerText: { color: '#7f1d1d', fontSize: 18, fontWeight: '600' },
  errCard: { margin: 16, padding: 20, backgroundColor: '#fee2e2', borderRadius: 12, borderWidth: 1, borderColor: '#fca5a5' },
  errTitle: { color: '#7f1d1d', fontSize: 18, fontWeight: '700' },
  errBody: { color: '#7f1d1d', fontSize: 14, marginTop: 6 },
});
