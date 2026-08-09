import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import authService from '../api/authService';
import { getToken, setToken } from '../api/axiosClient';

// Real JWT-backed auth (HLD Section 10/11). The server is always the source
// of truth for `role`; the UI only uses it to show/hide controls (NFR — the
// server enforces RBAC independently, see server/src/middleware/rbac.js).
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
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

  const value = {
    user,
    role: user?.role,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    canEdit: user?.role === 'compliance',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
