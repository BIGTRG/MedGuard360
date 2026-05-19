import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getStoredToken, logout as doLogout, login as doLogin, authenticateWithBiometrics } from '../lib/auth';
import { API_BASE } from '../constants';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email: string; role: string } | null;
  biometricVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyBiometric: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [biometricVerified, setBiometricVerified] = useState(false);

  useEffect(() => {
    getStoredToken().then(token => {
      if (token) {
        // Verify token and get user
        fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) { setUser(data); setIsAuthenticated(true); }
          })
          .catch(() => {})
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    const state = await doLogin(email, password);
    setUser({ id: state.userId, email: state.email, role: state.role });
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await doLogout();
    setUser(null);
    setIsAuthenticated(false);
    setBiometricVerified(false);
  };

  const verifyBiometric = async () => {
    const ok = await authenticateWithBiometrics();
    if (ok) setBiometricVerified(true);
    return ok;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, biometricVerified, login, logout, verifyBiometric }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
