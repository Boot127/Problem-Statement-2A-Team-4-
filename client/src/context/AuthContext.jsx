import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import authService from '../api/authService';
import { getToken, setToken } from '../api/axiosClient';

// Real JWT-backed auth (HLD Section 10/11). The server is always the source
// of truth for `role`; the UI only uses it to show/hide controls (NFR — the
// server enforces RBAC independently, see server/src/middleware/rbac.js).
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) {
      return;
    }
    authService
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const loggedInUser = await authService.login(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => {});
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await authService.me();
    setUser(currentUser);
    return currentUser;
  }, []);

  const value = {
    user,
    role: user?.role,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    refreshUser,
    canEdit: user?.role === 'compliance',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// This small provider module intentionally exports its matching hook.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
