import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY, REFRESH_KEY, API_BASE } from '../constants';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (res.status === 401) {
    // Try token refresh
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const { accessToken, refreshToken: newRefresh } = await refreshRes.json();
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_KEY, newRefresh);
        // Retry original request
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers: { ...headers, Authorization: `Bearer ${accessToken}` },
        });
        if (retryRes.ok) return retryRes.json();
      }
    }
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'API error');
  }
  return res.json();
}
