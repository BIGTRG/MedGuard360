import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { get, syncOutbox } from '@/lib/api';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface MeResponse {
  id: string; email: string; role: string;
  biometricVerifiedInSession: boolean;
}

export default function HomeScreen({ navigation }: Props): React.ReactElement {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [outboxStatus, setOutboxStatus] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      const profile = await get<MeResponse>('/v1/auth/me');
      setMe(profile);
      const sync = await syncOutbox();
      if (sync.replayed > 0) setOutboxStatus(`Synced ${sync.replayed} pending actions`);
      else if (sync.failed > 0) setOutboxStatus(`${sync.failed} pending actions failed to sync`);
      else setOutboxStatus(null);
    } catch {
      navigation.replace('Login');
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{me ? `Welcome back, ${me.email.split('@')[0]}` : 'Loading…'}</Text>
        {me?.role && <Text style={styles.role}>{me.role.replace(/_/g, ' ')}</Text>}
      </View>

      {!me?.biometricVerifiedInSession && (
        <TouchableOpacity style={styles.biometricBanner} onPress={() => navigation.navigate('Biometric')}>
          <Ionicons name="finger-print" size={24} color="#92400e" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.biometricTitle}>Biometric verification required</Text>
            <Text style={styles.biometricSubtitle}>Tap to verify before submitting claims or accessing crisis plans.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#92400e" />
        </TouchableOpacity>
      )}

      {outboxStatus && (
        <View style={styles.outboxStatus}><Text style={styles.outboxStatusText}>{outboxStatus}</Text></View>
      )}

      <View style={styles.actions}>
        <ActionCard icon="document-text" title="Start encounter"
          onPress={() => navigation.navigate('Encounter', {})} />
        <ActionCard icon="people" title="My patients" onPress={() => { /* nav to patients screen */ }} />
        <ActionCard icon="cash" title="Claims" onPress={() => { /* nav to claims screen */ }} />
        <ActionCard icon="clipboard" title="PA requests" onPress={() => { /* nav to PA screen */ }} />
      </View>
    </ScrollView>
  );
}

function ActionCard({ icon, title, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void }): React.ReactElement {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <Ionicons name={icon} size={28} color="#2168e3" />
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header:    { padding: 20, paddingBottom: 12 },
  greeting:  { fontSize: 22, fontWeight: '600', color: '#0f172a' },
  role:      { fontSize: 13, color: '#64748b', marginTop: 4, textTransform: 'capitalize' },
  biometricBanner: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, padding: 14, borderRadius: 10,
    backgroundColor: '#fef3c7', borderLeftWidth: 4, borderLeftColor: '#f59e0b',
  },
  biometricTitle:    { fontSize: 14, fontWeight: '600', color: '#92400e' },
  biometricSubtitle: { fontSize: 12, color: '#92400e', marginTop: 2 },
  outboxStatus:      { marginHorizontal: 16, padding: 10, borderRadius: 8, backgroundColor: '#e0f2fe' },
  outboxStatusText:  { fontSize: 12, color: '#075985' },
  actions:           { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard:        { width: '48%', padding: 16, backgroundColor: 'white', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  actionTitle:       { fontSize: 15, fontWeight: '600', color: '#0f172a', marginTop: 12 },
});
