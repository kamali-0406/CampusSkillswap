import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../services/authService';
import { friendlyError } from '../utils/errors';
import AuthShell from '../components/AuthShell';
import Field from '../components/Field';
import Button from '../components/Button';

export default function ConfirmSignUp() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(state?.notice || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(e) {
    e.preventDefault();
    setError(''); setNotice('');
    setLoading(true);
    try {
      await auth.confirmSignUp({ email, code });
      navigate('/signin', { state: { email, notice: 'Email verified. You can sign in now.' } });
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  }

  async function resend() {
    if (!email) return setError('Enter your email first.');
    setError(''); setResending(true);
    try {
      await auth.resendCode(email);
      setNotice('A new code is on its way.');
      setCooldown(30);
    } catch (err) {
      setError(friendlyError(err));
    } finally { setResending(false); }
  }

  return (
    <AuthShell title="Verify your email" subtitle="Enter the 6-digit code we sent to your inbox."
      footer={<Link to="/signin">Back to sign in</Link>}>
      {notice && <div className="note note-ok" role="status">{notice}</div>}
      {error && <div className="note note-error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <Field label="Email" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Verification code" id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        <Button type="submit" loading={loading} disabled={code.length < 6} className="btn-block">{loading ? 'Verifying…' : 'Verify email'}</Button>
      </form>
      <p style={{ marginTop: 14 }}>
        <Button variant="ghost" onClick={resend} loading={resending} disabled={cooldown > 0}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</Button>
      </p>
    </AuthShell>
  );
}
