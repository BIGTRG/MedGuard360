/**
 * Member-facing claims list — paginated, offline-cached.
 */
import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiFetch } from '../lib/api';
import { getSqlite } from '../lib/db';

interface Claim { id: string; claim_control_number: string; service_from: string; total_charge_cents: number; total_paid_cents: number | null; status: string; }

export default function MemberClaimsScreen({ navigation }: { navigation: any }): React.ReactElement {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load(): Promise<void> {
    try {
      const db = await getSqlite();
      const cached = await db.executeSql('SELECT data FROM kv WHERE key = ?', ['member:claims']);
      if (cached[0].rows.length > 0) setClaims(JSON.parse(cached[0].rows.item(0).data));
    } catch {}
    try {
      const data = await apiFetch<{ claims: Claim[] }>('/v1/patient/me/claims?limit=50');
      setClaims(data.claims);
      const db = await getSqlite();
      await db.executeSql('INSERT OR REPLACE INTO kv(key,data) VALUES (?,?)', ['member:claims', JSON.stringify(data.claims)]);
    } catch {}
  }
  useEffect(() => { load(); }, []);

  async function onRefresh(): Promise<void> { setRefreshing(true); await load(); setRefreshing(false); }

  return (
    <FlatList
      data={claims}
      keyExtractor={c => c.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={<Text style={styles.title}>Your claims</Text>}
      ListEmptyComponent={<Text style={styles.empty}>No claims on file.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ClaimDetail', { id: item.id })}>
          <View style={{ flex: 1 }}>
            <Text style={styles.amount}>${(item.total_charge_cents / 100).toFixed(2)}</Text>
            <Text style={styles.meta}>{item.service_from} · {item.claim_control_number}</Text>
            {item.total_paid_cents !== null && <Text style={styles.paid}>Paid: ${(item.total_paid_cents / 100).toFixed(2)}</Text>}
          </View>
          <Text style={[styles.status, styles[`status_${item.status}` as keyof typeof styles] as any]}>{item.status}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  title:    { padding: 20, fontSize: 22, fontWeight: '700', color: '#0f172a' },
  empty:    { padding: 20, color: '#64748b', fontStyle: 'italic' },
  row:      { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  amount:   { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  meta:     { fontSize: 12, color: '#64748b', marginTop: 2 },
  paid:     { fontSize: 13, color: '#15803d', marginTop: 4 },
  status:   { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  status_paid:       { backgroundColor: '#dcfce7', color: '#15803d' },
  status_submitted:  { backgroundColor: '#e0f2fe', color: '#0c4a6e' },
  status_fraud_review:{ backgroundColor: '#fef3c7', color: '#92400e' },
  status_denied:     { backgroundColor: '#fee2e2', color: '#991b1b' },
});
