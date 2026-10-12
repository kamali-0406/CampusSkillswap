import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <div className="center-screen"><Spinner label="Checking your session…" /></div>;
  if (status === 'anon') return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <div className="center-screen"><Spinner /></div>;
  if (status === 'authed') return <Navigate to="/" replace />;
  return <Outlet />;
}
