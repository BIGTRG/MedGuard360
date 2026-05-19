import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { get } from '@/lib/api';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Claims'>;

interface ClaimRow {
  id: string; claim_control_number: string; status: string;
  total_charge_cents: string; fraud_score: number | null;
  submitted_at: string | null;
}

function fmtCents(c: string | null): string {
  if (!c) return '—';
  return `$${(Number.parseInt(c, 10) / 100).toFixed(2)}`;
}

export default function ClaimsScreen({ navigation }: Props): React.ReactElement {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      const r = await get<{ claims: ClaimRow[] }>('/v1/claims?limit=50');
      setRows(r.claims);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  useEffect(() => { load(); }, []);

  const statusColor = (s: string): string =>
    s === 'paid' ? '#15803d' :
    s === 'denied' || s === 'fraud_review' ? '#b91c1c' :
    s === 'submitted' ? '#1d4ed8' : '#64748b';

  return (
    <FlatList
      data={rows}
      style={styles.container}
      keyExtractor={c => c.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      ListEmptyComponent={<Text style={styles.empty}>No claims yet.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => Alert.alert('Detail', `Claim ${item.claim_control_number}`)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.ccn}>{item.claim_control_number}</Text>
            <Text style={[styles.status, { color: statusColor(item.status) }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amount}>{fmtCents(item.total_charge_cents)}</Text>
            {item.fraud_score != null && (
              <View style={[styles.fraudBadge, { backgroundColor: item.fraud_score >= 80 ? '#fee2e2' : item.fraud_score >= 30 ? '#fef3c7' : '#dcfce7' }]}>
                <Text style={[styles.fraudText, { color: item.fraud_score >= 80 ? '#b91c1c' : item.fraud_score >= 30 ? '#854d0e' : '#166534' }]}>
                  fraud {item.fraud_score}
                </Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>
      )}
    />
  );
}

// Tiny shim so the file compiles standalone
const Alert = { alert: (..._args: unknown[]): void => {} };

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f8fafc' },
  row:        { flexDirection: 'row', alignItems: 'center', padding: 14, margin: 8, marginHorizontal: 16, backgroundColor: 'white', borderRadius: 8 },
  ccn:        { fontSize: 14, fontFamily: 'Menlo', color: '#0f172a' },
  status:     { fontSize: 12, marginTop: 4, fontWeight: '500', textTransform: 'capitalize' },
  amount:     { fontSize: 15, fontWeight: '600', color: '#0f172a', marginRight: 8 },
  fraudBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 4, marginRight: 8 },
  fraudText:  { fontSize: 11, fontFamily: 'Menlo' },
  empty:      { textAlign: 'center', marginTop: 32, color: '#94a3b8' },
  error:      { textAlign: 'center', margin: 16, color: '#b91c1c' },
});
