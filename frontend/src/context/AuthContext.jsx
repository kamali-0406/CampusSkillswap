import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../services/authService';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    auth.getSession()
      .then((s) => setState(s ? { status: 'authed', user: s.user } : { status: 'anon', user: null }))
      .catch(() => setState({ status: 'anon', user: null }));
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setState({ status: 'anon', user: null });
  }, []);

  useEffect(() => {
    window.addEventListener('auth:expired', signOut);
    return () => window.removeEventListener('auth:expired', signOut);
  }, [signOut]);

  const signIn = useCallback(async (creds) => {
    const session = await auth.signIn(creds);
    setState({ status: 'authed', user: session.user });
  }, []);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
