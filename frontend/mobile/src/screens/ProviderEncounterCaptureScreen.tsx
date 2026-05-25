/**
 * Provider mobile encounter capture — voice recording → server transcription → AI coding.
 *
 * Flow:
 *  1. Provider picks patient (drop-down from cached list)
 *  2. Big "Start recording" button — captures audio via expo-av
 *  3. On stop: uploads to clinical-doc-service /upload-audio
 *  4. Server pipeline (speech-to-text → clinical-nlp → code suggestions) runs async
 *  5. Provider sees transcript appear + suggested ICD/CPT codes
 *  6. Provider accepts/edits → sign encounter → claim drafted automatically
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { apiFetch } from '../lib/api';

interface Patient { id: string; first_name: string; last_name: string; medicaid_id: string }
interface Suggestion { code: string; codeType: 'ICD10' | 'CPT'; description: string; confidence: number }

export default function ProviderEncounterCaptureScreen({ navigation }: { navigation: any }): React.ReactElement {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ patients: Patient[] }>('/v1/provider/me/patients').then(d => setPatients(d.patients)).catch(() => {});
  }, []);

  async function startRecording(): Promise<void> {
    if (!selectedPatient) return;
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
    } catch (e) { console.error(e); }
  }

  async function stopRecording(): Promise<void> {
    if (!recording) return;
    setBusy(true);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (!uri || !selectedPatient) { setBusy(false); return; }

    // Upload audio (multipart). Once accepted, server runs pipeline.
    try {
      const form = new FormData();
      form.append('audio', { uri, name: 'encounter.m4a', type: 'audio/m4a' } as any);
      form.append('patientId', selectedPatient);
      const enc = await apiFetch<{ encounterId: string }>('/v1/clinical-doc/encounters/upload-audio',
        { method: 'POST', body: form as any, multipart: true });

      // Poll for transcript + suggestions
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const status = await apiFetch<{ transcript: string | null; suggestions: Suggestion[] }>(
          `/v1/clinical-doc/encounters/${enc.encounterId}/status`,
        );
        if (status.transcript) {
          setTranscript(status.transcript);
          setSuggestions(status.suggestions ?? []);
          break;
        }
      }
    } catch (e) { console.error(e); }
    setBusy(false);
  }

  return (
    <ScrollView style={styles.c}>
      <Text style={styles.title}>New encounter</Text>

      <Text style={styles.label}>Patient</Text>
      <ScrollView horizontal style={styles.patientRow}>
        {patients.map(p => (
          <TouchableOpacity key={p.id} onPress={() => setSelectedPatient(p.id)}
            style={[styles.patient, selectedPatient === p.id && styles.patientActive]}>
            <Text style={styles.patientName}>{p.first_name} {p.last_name}</Text>
            <Text style={styles.patientMeta}>{p.medicaid_id}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedPatient && !recording && !transcript && (
        <TouchableOpacity onPress={startRecording} style={styles.recBtn}>
          <Text style={styles.recBtnText}>● Start recording</Text>
        </TouchableOpacity>
      )}
      {recording && (
        <TouchableOpacity onPress={stopRecording} style={[styles.recBtn, styles.stopBtn]}>
          <Text style={styles.recBtnText}>■ Stop &amp; transcribe</Text>
        </TouchableOpacity>
      )}
      {busy && <View style={styles.busy}><ActivityIndicator /><Text>Transcribing via Whisper + extracting ICD/CPT…</Text></View>}

      {transcript && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Transcript</Text>
            <Text style={styles.transcript}>{transcript}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Suggested codes ({suggestions.length})</Text>
            {suggestions.map(s => (
              <View key={s.code} style={styles.suggestion}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.code}>{s.codeType} {s.code}</Text>
                  <Text style={styles.codeDesc}>{s.description}</Text>
                </View>
                <Text style={styles.conf}>{Math.round(s.confidence * 100)}%</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.signBtn} onPress={() => navigation.navigate('Encounter', { sign: true })}>
            <Text style={styles.signText}>Sign &amp; submit claim</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#f8fafc' },
  title: { padding: 20, paddingBottom: 8, fontSize: 22, fontWeight: '700' },
  label: { paddingHorizontal: 20, fontSize: 12, color: '#64748b', fontWeight: '600' },
  patientRow: { paddingHorizontal: 16, paddingVertical: 12 },
  patient: { padding: 12, marginRight: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', minWidth: 140 },
  patientActive: { borderColor: '#0ea5e9', backgroundColor: '#e0f2fe' },
  patientName: { fontWeight: '600', color: '#0f172a' },
  patientMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  recBtn: { margin: 16, padding: 24, backgroundColor: '#dc2626', borderRadius: 16, alignItems: 'center' },
  stopBtn: { backgroundColor: '#0f172a' },
  recBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  busy: { padding: 24, alignItems: 'center', gap: 8 },
  card: { margin: 16, marginTop: 8, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  transcript: { color: '#334155', lineHeight: 20 },
  suggestion: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  code: { fontFamily: 'Courier', fontWeight: '600', color: '#0c4a6e' },
  codeDesc: { fontSize: 13, color: '#475569', marginTop: 2 },
  conf: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  signBtn: { margin: 16, padding: 16, backgroundColor: '#15803d', borderRadius: 10, alignItems: 'center' },
  signText: { color: '#fff', fontWeight: '700' },
});
