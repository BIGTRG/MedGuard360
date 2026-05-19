import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { clearTokens } from '@/lib/storage';
import { syncOutbox } from '@/lib/api';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props): React.ReactElement {
  const [autoSync, setAutoSync] = useState(true);
  const [outboxCount, setOutboxCount] = useState(0);

  useEffect(() => {
    // Count of pending outbox items
    import('@/lib/storage').then(s => s.outboxPending().then(items => setOutboxCount(items.length)));
  }, []);

  const forceSync = async (): Promise<void> => {
    const r = await syncOutbox();
    Alert.alert('Sync complete', `Replayed ${r.replayed}, failed ${r.failed}.`);
    const s = await import('@/lib/storage');
    setOutboxCount((await s.outboxPending()).length);
  };

  const signOut = (): void => {
    Alert.alert('Sign out?', 'You will need to log in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await clearTokens();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }},
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Section title="Sync">
        <Row icon="cloud-upload" label="Pending outbox" value={`${outboxCount} item${outboxCount === 1 ? '' : 's'}`} />
        <Row icon="sync" label="Auto-sync on reconnect"
             control={<Switch value={autoSync} onValueChange={setAutoSync} />} />
        <Action icon="play" label="Force sync now" onPress={forceSync} />
      </Section>

      <Section title="Privacy & security">
        <Row icon="lock-closed" label="Biometric required" value="Always on" />
        <Row icon="shield-checkmark" label="HIPAA audit logging" value="Always on" />
        <Action icon="trash" label="Clear local cache" onPress={() => Alert.alert('TODO', 'Cache wipe coming next session')} />
      </Section>

      <Section title="About">
        <Row label="App version" value="0.1.0" />
        <Row label="API base" value={(process.env as Record<string, string>).MEDGUARD_API_BASE ?? '/api'} />
      </Section>

      <View style={{ padding: 16 }}>
        <TouchableOpacity style={styles.signOut} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color="#b91c1c" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ icon, label, value, control }: {
  icon?: keyof typeof Ionicons.glyphMap; label: string; value?: string; control?: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={styles.row}>
      {icon && <Ionicons name={icon} size={18} color="#64748b" style={{ width: 24 }} />}
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value !== undefined && <Text style={styles.rowValue}>{value}</Text>}
      {control}
    </View>
  );
}

function Action({ icon, label, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void;
}): React.ReactElement {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={18} color="#2168e3" style={{ width: 24 }} />
      <Text style={[styles.rowLabel, { color: '#2168e3' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  section:      { marginTop: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', paddingHorizontal: 20, marginBottom: 6 },
  sectionBody:  { backgroundColor: 'white' },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLabel:     { fontSize: 14, color: '#0f172a' },
  rowValue:     { fontSize: 13, color: '#64748b' },
  signOut:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, backgroundColor: 'white', borderRadius: 8 },
  signOutText:  { color: '#b91c1c', fontSize: 15, fontWeight: '500' },
});
