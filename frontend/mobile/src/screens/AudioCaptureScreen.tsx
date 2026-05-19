import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'AudioCapture'>;

/**
 * Audio capture for clinical dictation. Uses expo-av (Audio.Recording).
 *
 * NOTE: expo-av is installed lazily via dynamic import so the rest of the app
 * builds without it. To enable: `npx expo install expo-av` then remove the
 * try/catch wrap on the import.
 *
 * Flow:
 *  1. User taps record → Audio.Recording starts
 *  2. User taps stop → recording finalizes to a temp file URI
 *  3. We upload the file as multipart to /v1/clinical-doc/encounters/:id/audio
 *  4. Server transcribes via speech-to-text + codes via clinical-nlp
 */

export default function AudioCaptureScreen({ route, navigation }: Props): React.ReactElement {
  const { encounterId } = route.params;
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recObj, setRecObj] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (recording) timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => { if (timer) clearInterval(timer); };
  }, [recording]);

  const start = async (): Promise<void> => {
    setError(null);
    try {
      const av = await import('expo-av').catch(() => null);
      if (!av) {
        Alert.alert('Not installed', "Run 'npx expo install expo-av' to enable audio capture.");
        return;
      }
      await av.Audio.requestPermissionsAsync();
      await av.Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new av.Audio.Recording();
      await rec.prepareToRecordAsync(av.Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecObj(rec);
      setRecording(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const stopAndUpload = async (): Promise<void> => {
    if (!recObj) return;
    setRecording(false);
    try {
      const rec = recObj as { stopAndUnloadAsync: () => Promise<void>; getURI: () => string | null };
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) throw new Error('No recording URI');
      if (!encounterId) {
        Alert.alert('Saved locally', `Recording at ${uri}. Start an encounter to upload.`);
        return;
      }

      // Multipart upload to clinical-doc-service
      const form = new FormData();
      form.append('audio', { uri, name: 'dictation.m4a', type: 'audio/m4a' } as never);
      // Use raw fetch — `send` is for JSON; the api wrapper supports stringified bodies only.
      const SecureStore = await import('expo-secure-store');
      const token = await SecureStore.getItemAsync('mg_access');
      const resp = await fetch(`/api/v1/clinical-doc/encounters/${encounterId}/audio`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      if (!resp.ok) throw new Error(`Upload failed: HTTP ${resp.status}`);
      Alert.alert('Uploaded', 'Server is transcribing and extracting codes.');
      navigation.goBack();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRecObj(null); setDuration(0);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.micCircle, recording && styles.micCircleRecording]}>
        <Ionicons name={recording ? 'mic' : 'mic-outline'} size={56} color={recording ? '#dc2626' : '#2168e3'} />
      </View>
      <Text style={styles.duration}>
        {Math.floor(duration / 60).toString().padStart(2, '0')}:
        {(duration % 60).toString().padStart(2, '0')}
      </Text>
      <Text style={styles.hint}>
        {recording
          ? 'Recording your dictation… Tap stop when done.'
          : 'Tap to start dictating clinical notes. Audio is transcribed server-side via Whisper and coded automatically.'}
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity
        style={[styles.button, recording && styles.buttonStop]}
        onPress={recording ? stopAndUpload : start}
      >
        <Ionicons name={recording ? 'stop' : 'play'} size={20} color="white" />
        <Text style={styles.buttonText}>{recording ? 'Stop & upload' : 'Start recording'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f8fafc' },
  micCircle:         { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe' },
  micCircleRecording:{ backgroundColor: '#fee2e2' },
  duration:          { fontSize: 32, fontWeight: '300', marginTop: 24, color: '#0f172a', fontVariant: ['tabular-nums'] },
  hint:              { textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 12, maxWidth: 280 },
  error:             { color: '#b91c1c', marginTop: 16 },
  button:            { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, marginTop: 32, borderRadius: 30, backgroundColor: '#2168e3' },
  buttonStop:        { backgroundColor: '#dc2626' },
  buttonText:        { color: 'white', fontSize: 16, fontWeight: '600' },
});
