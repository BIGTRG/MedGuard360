/**
 * Crisis Responder mobile — 3-second access to patient crisis plan.
 *
 * Auth: responder logs in with NCID + hardware token + biometric. Token carries
 * `role=emergency_responder` + ephemeral patient-scope grant for active alerts.
 *
 * Flow:
 *  1. Responder accepts alert (push notification deep-links here)
 *  2. Biometric prompt (sub-1-second on modern phones)
 *  3. Patient crisis plan, GPS pin, recent meds, allergies, PCP contact
 *  4. ACTION buttons: arrived, transported, resolved, refused care
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking, Alert } from 'react-native';
import { apiFetch } from '../lib/api';
import { promptBiometric } from '../lib/auth';

interface AlertDetail {
  id: string; severity: string; detected_at: string;
  patient: { id: string; first_name: string; last_name: string; dob: string; medicaid_id: string };
  location: { lat: number; lng: number; address: string } | null;
  plan: { warning_signs: string[]; coping_strategies: string[]; emergency_contacts: { name: string; phone: string }[] };
  allergies: string[];
  current_meds: { drug: string; dose: string }[];
  pcp: { name: string; phone: string };
}

export default function CrisisResponderScreen({ route }: { route: { params: { alertId: string } } }): React.ReactElement {
  const { alertId } = route.params;
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState<AlertDetail | null>(null);

  useEffect(() => { (async () => {
    const ok = await promptBiometric('Verify responder identity');
    if (!ok) { Alert.alert('Identity verification required'); return; }
    setUnlocked(true);
    try { const d = await apiFetch<AlertDetail>(`/v1/crisis/alerts/${alertId}/responder-view`); setData(d); }
    catch (e) { Alert.alert('Failed to load', (e as Error).message); }
  })(); }, []);

  if (!unlocked) return <View style={styles.center}><Text>Biometric required…</Text></View>;
  if (!data)    return <View style={styles.center}><Text>Loading patient data…</Text></View>;

  function openMaps(): void {
    if (!data?.location) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${data.location.lat},${data.location.lng}`);
  }
  async function setStatus(status: string): Promise<void> {
    await apiFetch(`/v1/crisis/alerts/${alertId}/responder-action`, { method: 'POST', body: { status } });
    Alert.alert('Updated', `Status set to ${status}.`);
  }

  return (
    <ScrollView style={styles.c}>
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroSeverity}>SEVERITY: {data.severity.toUpperCase()}</Text>
          <Text style={styles.heroName}>{data.patient.first_name} {data.patient.last_name}</Text>
          <Text style={styles.heroMeta}>DOB {data.patient.dob} · {data.patient.medicaid_id}</Text>
        </View>
      </View>

      {data.location && (
        <TouchableOpacity onPress={openMaps} style={styles.locCard}>
          <Text style={styles.locTitle}>📍 {data.location.address}</Text>
          <Text style={styles.locMeta}>Tap to open in Maps · {data.location.lat.toFixed(4)}, {data.location.lng.toFixed(4)}</Text>
        </TouchableOpacity>
      )}

      <Card title="Crisis plan" >
        <Section title="Warning signs"     items={data.plan.warning_signs} />
        <Section title="Coping strategies" items={data.plan.coping_strategies} />
        <Section title="Emergency contacts" items={data.plan.emergency_contacts.map(c => `${c.name} · ${c.phone}`)} callable={data.plan.emergency_contacts.map(c => c.phone)} />
      </Card>

      <Card title="Medical">
        <Section title="Allergies" items={data.allergies.length ? data.allergies : ['None on file']} />
        <Section title="Current meds" items={data.current_meds.map(m => `${m.drug} ${m.dose}`)} />
        <Section title="PCP" items={[`${data.pcp.name} · ${data.pcp.phone}`]} callable={[data.pcp.phone]} />
      </Card>

      <View style={styles.actions}>
        <ActionBtn label="Arrived"        color="#0c4a6e" onPress={() => setStatus('arrived')} />
        <ActionBtn label="Transporting"   color="#a16207" onPress={() => setStatus('transporting')} />
        <ActionBtn label="Resolved"       color="#15803d" onPress={() => setStatus('resolved')} />
        <ActionBtn label="Refused care"   color="#7f1d1d" onPress={() => setStatus('refused')} />
      </View>
    </ScrollView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View>;
}
function Section({ title, items, callable }: { title: string; items: string[]; callable?: string[] }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((s, i) => callable && callable[i] ? (
        <TouchableOpacity key={i} onPress={() => Linking.openURL(`tel:${callable[i]}`)}>
          <Text style={[styles.item, styles.tap]}>{s} ☎</Text>
        </TouchableOpacity>
      ) : <Text key={i} style={styles.item}>• {s}</Text>)}
    </View>
  );
}
function ActionBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.action, { backgroundColor: color }]}><Text style={styles.actionText}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  hero: { backgroundColor: '#dc2626', padding: 20 },
  heroSeverity: { color: '#fee2e2', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  heroName: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 4 },
  heroMeta: { color: '#fecaca', marginTop: 4 },
  locCard: { margin: 16, padding: 16, backgroundColor: '#1e293b', borderRadius: 12 },
  locTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  locMeta: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  card: { margin: 16, marginTop: 8, padding: 16, backgroundColor: '#1e293b', borderRadius: 12 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  item: { color: '#e2e8f0', fontSize: 14, marginVertical: 2 },
  tap: { color: '#7dd3fc', textDecorationLine: 'underline' },
  actions: { padding: 16, gap: 10 },
  action: { padding: 16, borderRadius: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
