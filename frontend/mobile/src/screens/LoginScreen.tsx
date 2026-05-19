import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>MG</Text>
        </View>
        <Text style={styles.title}>MedGuard360</Text>
        <Text style={styles.subtitle}>Medicaid Fraud Prevention</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email} onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password} onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>HIPAA-compliant • AES-256 encrypted • TLS 1.3</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.brand[700], justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 64, height: 64, backgroundColor: COLORS.white, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { color: COLORS.brand[700], fontWeight: 'bold', fontSize: 22 },
  title: { color: COLORS.white, fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#bedffd', fontSize: 14, marginTop: 4 },
  form: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.gray[700], marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.gray[100], borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.gray[900] },
  button: { backgroundColor: COLORS.brand[600], borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  footer: { color: '#bedffd', fontSize: 11, textAlign: 'center', marginTop: 24 },
});
