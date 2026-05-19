import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { send } from '@/lib/api';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Biometric'>;

export default function BiometricScreen({ navigation }: Props): React.ReactElement {
  const [busy, setBusy] = useState(false);

  const verify = async (): Promise<void> => {
    setBusy(true);
    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      if (!supported) {
        Alert.alert('Unavailable', 'This device has no biometric hardware.');
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Not enrolled', 'Set up Face ID / Touch ID / fingerprint in device settings first.');
        return;
      }

      // Phase 1: device-level biometric (Face ID / Touch ID / Fingerprint).
      // This unlocks the secure enclave that holds our refresh token.
      const localResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity',
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
      });
      if (!localResult.success) {
        Alert.alert('Verification failed', 'Local biometric was not accepted.');
        return;
      }

      // Phase 2: vendor biometric verify (Suprema/NEC). In production the
      // vendor SDK captures a fresh template and submits it. Here we send a
      // PASS payload — the server uses the active vendor for the user's state.
      // (Replace with real SDK capture before shipping.)
      const samplePayloadBase64 = 'UEFTUw==';   // base64('PASS')
      await send('POST', '/v1/auth/biometric/verify', {
        modality: 'face',
        samplePayloadBase64,
      });

      navigation.goBack();
    } catch (err) {
      Alert.alert('Biometric failed', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="finger-print" size={64} color="#2168e3" />
      <Text style={styles.title}>Verify your identity</Text>
      <Text style={styles.subtitle}>
        Required to submit claims, access crisis plans, and export patient records.
      </Text>
      <TouchableOpacity
        style={[styles.button, busy && { opacity: 0.5 }]}
        onPress={verify} disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? 'Scanning…' : 'Scan now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f8fafc' },
  title:     { fontSize: 20, fontWeight: '600', color: '#0f172a', marginTop: 16 },
  subtitle:  { fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center' },
  button:    { marginTop: 24, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10, backgroundColor: '#2168e3' },
  buttonText:{ color: 'white', fontWeight: '600', fontSize: 15 },
});
