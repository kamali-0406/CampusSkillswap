import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/authService';
import { friendlyError, PASSWORD_HINT, PASSWORD_RULE } from '../utils/errors';
import AuthShell from '../components/AuthShell';
import Field from '../components/Field';
import Button from '../components/Button';

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name.';
    if (!PASSWORD_RULE.test(form.password)) next.password = PASSWORD_HINT;
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setError('');
    setLoading(true);
    try {
      await auth.signUp({ name: form.name, email: form.email, password: form.password });
      navigate('/verify', { state: { email: form.email, notice: 'Account created. We emailed you a verification code.' } });
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Use your student email so classmates recognise you."
      footer={<>Already registered? <Link to="/signin">Sign in</Link></>}>
      {error && <div className="note note-error" role="alert">{error}</div>}
      <form onSubmit={submit} noValidate>
        <Field label="Full name" id="name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <Field label="Email" id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <Field label="Password" id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} hint={PASSWORD_HINT} error={errors.password} />
        <Field label="Confirm password" id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" loading={loading} className="btn-block">{loading ? 'Creating account…' : 'Create account'}</Button>
      </form>
    </AuthShell>
  );
}
