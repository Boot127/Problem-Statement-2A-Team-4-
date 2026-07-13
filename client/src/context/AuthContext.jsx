import { createContext, useContext } from 'react';

// TODO: provide current user, role, and token; wire up login/logout
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
