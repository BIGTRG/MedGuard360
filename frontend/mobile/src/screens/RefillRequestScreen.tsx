/**
 * Prescription refill request — biometric-gated.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { apiFetch } from '../lib/api';
import { promptBiometric } from '../lib/auth';

interface Rx { id: string; drug_name: string; ndc_code: string; days_supply: number; last_filled: string; refills_remaining: number; pharmacy_name: string; }

export default function RefillRequestScreen({ navigation }: { navigation: any }): React.ReactElement {
  const [rxs, setRxs] = useState<Rx[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ prescriptions: Rx[] }>('/v1/patient/me/prescriptions?refillable=1')
      .then(d => setRxs(d.prescriptions))
      .catch(() => setRxs([]));
  }, []);

  async function request(): Promise<void> {
    if (!selected) return;
    const ok = await promptBiometric('Verify identity to request refill');
    if (!ok) { Alert.alert('Biometric required', 'Refill canceled.'); return; }
    setSubmitting(true);
    try {
      await apiFetch('/v1/patient/me/refill-requests', { method: 'POST', body: { prescriptionId: selected } });
      Alert.alert('Refill requested', 'Your pharmacy has been notified. You will receive a notification when ready.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Refill failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.c}>
      <Text style={styles.title}>Request a refill</Text>
      <Text style={styles.sub}>Pick a medication. Biometric verification required before submitting.</Text>
      {rxs.length === 0 && <Text style={styles.empty}>No refillable prescriptions on file.</Text>}
      {rxs.map(r => (
        <TouchableOpacity key={r.id} onPress={() => setSelected(r.id)}
          style={[styles.rx, selected === r.id && styles.rxActive]}>
          <Text style={styles.drug}>{r.drug_name}</Text>
          <Text style={styles.meta}>NDC {r.ndc_code} · {r.days_supply}-day supply</Text>
          <Text style={styles.meta}>Last filled {r.last_filled} · {r.refills_remaining} refills left</Text>
          <Text style={styles.meta}>Pharmacy: {r.pharmacy_name}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={request} disabled={!selected || submitting}
        style={[styles.submit, (!selected || submitting) && styles.disabled]}>
        <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Request refill (biometric required)'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#f8fafc' },
  title: { padding: 20, paddingBottom: 4, fontSize: 22, fontWeight: '700' },
  sub: { paddingHorizontal: 20, paddingBottom: 16, color: '#64748b' },
  empty: { padding: 20, color: '#64748b', fontStyle: 'italic' },
  rx: { margin: 16, marginTop: 8, padding: 14, backgroundColor: '#fff', borderRadius: 10, borderWidth: 2, borderColor: '#e2e8f0' },
  rxActive: { borderColor: '#0ea5e9' },
  drug: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  submit: { margin: 16, padding: 16, backgroundColor: '#0ea5e9', borderRadius: 10, alignItems: 'center' },
  disabled: { backgroundColor: '#94a3b8' },
  submitText: { color: '#fff', fontWeight: '600' },
});
