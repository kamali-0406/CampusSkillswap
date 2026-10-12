import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../services/authService';
import { friendlyError, PASSWORD_HINT, PASSWORD_RULE } from '../utils/errors';
import AuthShell from '../components/AuthShell';
import Field from '../components/Field';
import Button from '../components/Button';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ email: state?.email || '', code: '', newPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!PASSWORD_RULE.test(form.newPassword)) return setError(PASSWORD_HINT);
    setError(''); setLoading(true);
    try {
      await auth.resetPassword(form);
      navigate('/signin', { state: { email: form.email, notice: 'Password updated. Sign in with your new password.' } });
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Set a new password" subtitle="Enter the code from your email and choose a new password."
      footer={<Link to="/signin">Back to sign in</Link>}>
      {state?.notice && <div className="note note-ok" role="status">{state.notice}</div>}
      {error && <div className="note note-error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <Field label="Email" id="email" type="email" required value={form.email} onChange={set('email')} />
        <Field label="Reset code" id="code" inputMode="numeric" autoComplete="one-time-code" required value={form.code} onChange={set('code')} />
        <Field label="New password" id="newPassword" type="password" autoComplete="new-password" required value={form.newPassword} onChange={set('newPassword')} hint={PASSWORD_HINT} />
        <Button type="submit" loading={loading} className="btn-block">{loading ? 'Updating…' : 'Update password'}</Button>
      </form>
    </AuthShell>
  );
}
