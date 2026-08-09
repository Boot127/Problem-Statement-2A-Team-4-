import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleProtectedRoute({ roles, children }) {
  const { role } = useAuth();
  const location = useLocation();
  if (!roles.includes(role)) {
    return <Navigate to="/" replace state={{ deniedPath: location.pathname }} />;
  }
  return children;
}
