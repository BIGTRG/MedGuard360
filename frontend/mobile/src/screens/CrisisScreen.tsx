import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { COLORS } from '../constants';
import { useState } from 'react';

export function CrisisScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [activating, setActivating] = useState(false);

  const activateCrisis = async () => {
    Alert.alert(
      'Activate Crisis Alert',
      'This will immediately notify emergency contacts and activate crisis protocols.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate', style: 'destructive',
          onPress: async () => {
            setActivating(true);
            try {
              await apiFetch('/v1/crisis/alerts', {
                method: 'POST',
                body: JSON.stringify({ stateCode: 'NC', alertType: 'behavioral', severity: 'high', description: 'Crisis activated via mobile app' }),
              });
              Alert.alert('Crisis Alert Activated', 'Emergency contacts have been notified. Crisis team is responding.');
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to activate crisis alert');
            } finally {
              setActivating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crisis Response</Text>
        <Text style={styles.subtitle}>Emergency access verified via biometric authentication</Text>
      </View>

      <TouchableOpacity
        style={[styles.crisisButton, activating && { opacity: 0.6 }]}
        onPress={activateCrisis}
        disabled={activating}
      >
        <Text style={styles.crisisIcon}>🚨</Text>
        <Text style={styles.crisisLabel}>{activating ? 'Activating…' : 'Activate Crisis Alert'}</Text>
        <Text style={styles.crisisSubtext}>Notifies emergency contacts + crisis team</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Crisis Protocols</Text>
      {[
        { step: '1', text: 'Ensure patient safety — remove immediate hazards' },
        { step: '2', text: 'Call 911 if immediate danger to life' },
        { step: '3', text: 'Review crisis plan — tap "View Crisis Plan"' },
        { step: '4', text: 'Contact designated emergency contacts' },
        { step: '5', text: 'Document incident in encounter notes' },
      ].map(({ step, text }) => (
        <View key={step} style={styles.protocol}>
          <View style={styles.step}><Text style={styles.stepText}>{step}</Text></View>
          <Text style={styles.protocolText}>{text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  header: { padding: 24, backgroundColor: COLORS.danger },
  title: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  crisisButton: { margin: 20, backgroundColor: COLORS.danger, borderRadius: 16, padding: 28, alignItems: 'center', elevation: 4 },
  crisisIcon: { fontSize: 40 },
  crisisLabel: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  crisisSubtext: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray[700], marginHorizontal: 20, marginTop: 8, marginBottom: 12 },
  protocol: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, backgroundColor: COLORS.white, marginHorizontal: 20, marginBottom: 8, borderRadius: 10 },
  step: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.brand[700], alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  stepText: { color: COLORS.white, fontWeight: 'bold', fontSize: 13 },
  protocolText: { flex: 1, fontSize: 14, color: COLORS.gray[700], lineHeight: 20 },
});
