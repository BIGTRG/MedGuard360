/**
 * NEMT (Non-Emergency Medical Transport) booking — sends to MTM/ModivCare per state plan.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { apiFetch } from '../lib/api';

type VehicleClass = 'ambulatory' | 'wheelchair' | 'stretcher';

export default function BookRideScreen({ navigation }: { navigation: any }): React.ReactElement {
  const [pickup, setPickup] = useState('');
  const [dest, setDest] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [vehicle, setVehicle] = useState<VehicleClass>('ambulatory');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function book(): Promise<void> {
    if (!pickup || !dest || !date || !time) {
      Alert.alert('Missing info', 'Pickup, destination, date and time are required.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/v1/nemt/trips', {
        method: 'POST',
        body: {
          pickupAddress: pickup, destAddress: dest,
          scheduledAt: `${date}T${time}:00`,
          vehicleClass: vehicle, appointmentReason: reason,
        },
      });
      Alert.alert('Ride requested', 'Your broker will confirm within 30 minutes. You\'ll receive a text with the driver details.');
      navigation.goBack();
    } catch (e) { Alert.alert('Booking failed', (e as Error).message); }
    finally { setSubmitting(false); }
  }

  return (
    <ScrollView style={styles.c}>
      <Text style={styles.title}>Book a ride</Text>
      <Text style={styles.sub}>NEMT — non-emergency medical transport. Covered when you have a Medicaid-billable medical appointment.</Text>

      <Field label="Pickup address"      value={pickup} onChange={setPickup} placeholder="123 Main St, Raleigh NC" />
      <Field label="Destination address" value={dest}   onChange={setDest}   placeholder="789 Hospital Dr, Raleigh NC" />
      <View style={styles.row2}>
        <Field label="Date"  value={date} onChange={setDate} placeholder="2026-05-30" />
        <Field label="Time"  value={time} onChange={setTime} placeholder="14:30" />
      </View>

      <Text style={styles.label}>Vehicle</Text>
      <View style={styles.vehicleRow}>
        {(['ambulatory','wheelchair','stretcher'] as VehicleClass[]).map(v => (
          <TouchableOpacity key={v} onPress={() => setVehicle(v)}
            style={[styles.vbtn, vehicle === v && styles.vbtnActive]}>
            <Text style={[styles.vtxt, vehicle === v && styles.vtxtActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="Appointment reason (optional)" value={reason} onChange={setReason} placeholder="Cardiology follow-up" />

      <TouchableOpacity onPress={book} disabled={submitting} style={[styles.submit, submitting && styles.disabled]}>
        <Text style={styles.submitText}>{submitting ? 'Booking…' : 'Request ride'}</Text>
      </TouchableOpacity>

      <Text style={styles.fineprint}>Booking sends to your plan's NEMT broker (MTM Link or ModivCare). GPS-validated mileage is billed under HCPCS A0100/A0130/A0090 depending on vehicle class.</Text>
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }): React.ReactElement {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} style={styles.input} placeholderTextColor="#94a3b8" />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#f8fafc' },
  title: { padding: 20, paddingBottom: 4, fontSize: 22, fontWeight: '700' },
  sub: { paddingHorizontal: 20, paddingBottom: 16, color: '#64748b' },
  field: { paddingHorizontal: 16, paddingBottom: 12 },
  row2: { flexDirection: 'row' },
  label: { paddingHorizontal: 16, paddingTop: 8, fontSize: 12, color: '#64748b', fontWeight: '600' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14 },
  vehicleRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 8 },
  vbtn: { flex: 1, padding: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  vbtnActive: { borderColor: '#0ea5e9', backgroundColor: '#e0f2fe' },
  vtxt: { fontSize: 13, color: '#0f172a' },
  vtxtActive: { fontWeight: '700', color: '#0c4a6e' },
  submit: { margin: 16, padding: 16, backgroundColor: '#0ea5e9', borderRadius: 10, alignItems: 'center' },
  disabled: { backgroundColor: '#94a3b8' },
  submitText: { color: '#fff', fontWeight: '600' },
  fineprint: { padding: 20, color: '#64748b', fontSize: 11, lineHeight: 16 },
});
