import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants';

interface StatBoxProps { label: string; value: string; color?: string; }
function StatBox({ label, value, color = COLORS.brand[700] }: StatBoxProps) {
  return (
    <View style={[styles.statBox, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function DashboardScreen({ navigation }: { navigation: any }) {
  const { user, logout, verifyBiometric } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.email ?? 'Provider'}</Text>
          <Text style={styles.role}>{user?.role?.replace(/_/g, ' ')}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Summary</Text>
      <View style={styles.statsGrid}>
        <StatBox label="Patients" value="—" />
        <StatBox label="Claims" value="—" />
        <StatBox label="Fraud Cases" value="—" color={COLORS.danger} />
        <StatBox label="PA Pending" value="—" color={COLORS.warning} />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actions}>
        {[
          { label: 'Start Encounter', screen: 'Encounter', icon: '🎙️' },
          { label: 'Check Eligibility', screen: 'Eligibility', icon: '✓' },
          { label: 'Submit Claim', screen: 'Claims', icon: '📄' },
          { label: 'Crisis Response', screen: 'Crisis', icon: '🚨', requiresBio: true },
        ].map(({ label, screen, icon, requiresBio }) => (
          <TouchableOpacity
            key={screen}
            style={styles.actionCard}
            onPress={async () => {
              if (requiresBio) {
                const ok = await verifyBiometric();
                if (!ok) { Alert.alert('Authentication Required', 'Biometric authentication is required for crisis access'); return; }
              }
              navigation.navigate(screen);
            }}
          >
            <Text style={styles.actionIcon}>{icon}</Text>
            <Text style={styles.actionLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  header: { backgroundColor: COLORS.brand[700], padding: 24, paddingTop: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: '#bedffd', fontSize: 14 },
  name: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  role: { color: '#bedffd', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray[700], marginTop: 24, marginBottom: 12, marginHorizontal: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  statBox: { width: '46%', margin: '2%', backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderLeftWidth: 4, elevation: 1 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: COLORS.gray[900] },
  statLabel: { fontSize: 12, color: COLORS.gray[500], marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 24 },
  actionCard: { width: '46%', margin: '2%', backgroundColor: COLORS.white, borderRadius: 12, padding: 20, alignItems: 'center', elevation: 1 },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray[700], textAlign: 'center' },
});
