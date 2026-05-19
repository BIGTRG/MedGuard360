import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { TOKEN_KEY, REFRESH_KEY, API_BASE } from '../constants';

export interface AuthState {
  userId: string;
  email: string;
  role: string;
  accessToken: string;
  biometricVerified: boolean;
}

export async function login(email: string, password: string): Promise<AuthState> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(err.message ?? 'Login failed');
  }
  const data = await res.json();
  await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
  return { userId: data.user?.id ?? '', email, role: data.user?.role ?? '', accessToken: data.accessToken, biometricVerified: false };
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${await SecureStore.getItemAsync(TOKEN_KEY)}` } }).catch(() => {});
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to access MedGuard360',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
