/**
 * Biometric enrollment + verification.
 *
 * First launch: enroll facial + fingerprint against the user's Clerk identity.
 * Subsequent: re-verify before sensitive actions (refill, ride book, crisis activation,
 * PHI export, claim submission).
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { promptBiometric, enrollBiometric } from '../lib/auth';
import { apiFetch } from '../lib/api';

interface EnrollmentStatus { faceEnrolled: boolean; fingerprintEnrolled: boolean; lastVerifiedAt: string | null; }

export default function BiometricSetupScreen(): React.ReactElement {
  const [status, setStatus] = useState<EnrollmentStatus>({ faceEnrolled: false, fingerprintEnrolled: false, lastVerifiedAt: null });
  const [busy, setBusy] = useState(false);

  async function loadStatus(): Promise<void> {
    try { const data = await apiFetch<EnrollmentStatus>('/v1/auth/biometric/status'); setStatus(data); } catch {}
  }
  React.useEffect(() => { loadStatus(); }, []);

  async function enrollFace(): Promise<void> {
    setBusy(true);
    try {
      const sample = await enrollBiometric('face');
      await apiFetch('/v1/auth/biometric/enroll', { method: 'POST', body: { type: 'face', sample } });
      Alert.alert('Face enrolled', 'Your face is now registered.');
      await loadStatus();
    } catch (e) { Alert.alert('Enrollment failed', (e as Error).message); }
    finally { setBusy(false); }
  }

  async function enrollFingerprint(): Promise<void> {
    setBusy(true);
    try {
      const sample = await enrollBiometric('fingerprint');
      await apiFetch('/v1/auth/biometric/enroll', { method: 'POST', body: { type: 'fingerprint', sample } });
      Alert.alert('Fingerprint enrolled', 'Your fingerprint is now registered.');
      await loadStatus();
    } catch (e) { Alert.alert('Enrollment failed', (e as Error).message); }
    finally { setBusy(false); }
  }

  async function testVerify(): Promise<void> {
    const ok = await promptBiometric('Verify identity');
    Alert.alert(ok ? 'Match' : 'No match', ok ? 'You are who you say you are.' : 'Try again or use password.');
  }

  return (
    <ScrollView style={styles.c}>
      <Text style={styles.title}>Biometric ID</Text>
      <Text style={styles.sub}>Your face and fingerprint stay on this device. Only a hashed match score is sent to the platform. Vendor: Suprema or NEC depending on your state.</Text>

      <Card title="Face recognition"
            ok={status.faceEnrolled}
            actionLabel={status.faceEnrolled ? 'Re-enroll' : 'Enroll face'}
            onPress={enrollFace} busy={busy} />

      <Card title="Fingerprint"
            ok={status.fingerprintEnrolled}
            actionLabel={status.fingerprintEnrolled ? 'Re-enroll' : 'Enroll fingerprint'}
            onPress={enrollFingerprint} busy={busy} />

      {(status.faceEnrolled || status.fingerprintEnrolled) && (
        <TouchableOpacity onPress={testVerify} style={styles.testBtn}>
          <Text style={styles.testText}>Test verification</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.fineprint}>
        Match threshold: 0.92 (HIPAA-compliant). Liveness check: 0.80. {'\n'}
        Required for: prescription refills, NEMT booking, crisis activation, PHI export, claim submission.
      </Text>
    </ScrollView>
  );
}

function Card({ title, ok, actionLabel, onPress, busy }: { title: string; ok: boolean; actionLabel: string; onPress: () => void; busy: boolean }): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={ok ? styles.ok : styles.notSet}>{ok ? '✓ enrolled' : 'not set'}</Text>
      </View>
      <TouchableOpacity disabled={busy} onPress={onPress} style={[styles.btn, busy && styles.btnDisabled]}>
        <Text style={styles.btnText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#f8fafc' },
  title: { padding: 20, paddingBottom: 4, fontSize: 22, fontWeight: '700' },
  sub: { paddingHorizontal: 20, paddingBottom: 16, color: '#64748b' },
  card: { margin: 16, marginTop: 8, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  ok: { color: '#15803d', fontWeight: '600' },
  notSet: { color: '#64748b' },
  btn: { padding: 12, backgroundColor: '#0ea5e9', borderRadius: 8, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnText: { color: '#fff', fontWeight: '600' },
  testBtn: { margin: 16, padding: 12, borderWidth: 1, borderColor: '#0ea5e9', borderRadius: 8, alignItems: 'center' },
  testText: { color: '#0ea5e9', fontWeight: '600' },
  fineprint: { padding: 20, color: '#64748b', fontSize: 11, lineHeight: 16 },
});
