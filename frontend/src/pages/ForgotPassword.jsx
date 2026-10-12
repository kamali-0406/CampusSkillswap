import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/authService';
import { friendlyError } from '../utils/errors';
import AuthShell from '../components/AuthShell';
import Field from '../components/Field';
import Button from '../components/Button';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await auth.forgotPassword(email);
      navigate('/reset-password', { state: { email, notice: 'If that email has an account, a reset code is on its way.' } });
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="We will email you a code to set a new one."
      footer={<Link to="/signin">Back to sign in</Link>}>
      {error && <div className="note note-error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <Field label="Email" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" loading={loading} className="btn-block">{loading ? 'Sending code…' : 'Send reset code'}</Button>
      </form>
    </AuthShell>
  );
}
