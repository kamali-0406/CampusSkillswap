import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/authService';
import { friendlyError } from '../utils/errors';
import AuthShell from '../components/AuthShell';
import Field from '../components/Field';
import Button from '../components/Button';

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: location.state?.email || '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(form);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      if ((err.code || err.name) === 'UserNotConfirmedException') {
        auth.resendCode(form.email).catch(() => {});
        navigate('/verify', { state: { email: form.email, notice: 'Your email is not verified yet. We sent you a new code.' } });
        return;
      }
      setError(friendlyError(err));
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to find your next skill swap."
      footer={<><Link to="/signup">Create an account</Link><Link to="/forgot-password">Forgot password?</Link></>}>
      {location.state?.notice && <div className="note note-ok" role="status">{location.state.notice}</div>}
      {error && <div className="note note-error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <Field label="Email" id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <Field label="Password" id="password" type="password" autoComplete="current-password" required value={form.password} onChange={set('password')} />
        <Button type="submit" loading={loading} className="btn-block">{loading ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </AuthShell>
  );
}
