import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../utils/errors';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import Avatar from '../components/Avatar';
import Field from '../components/Field';
import Button from '../components/Button';
import SkillChip from '../components/SkillChip';

export default function Profile() {
  const toast = useToast();
  const { data: profile, loading, error, reload, setData } = useFetch(() => api.getMe(), []);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', studentId: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (profile) setForm({ name: profile.name, studentId: profile.studentId || '', bio: profile.bio || '' });
  }, [profile]);

  if (loading) return <Spinner label="Loading your profile…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  async function save(e) {
    e.preventDefault();
    setFormError(''); setSaving(true);
    try {
      setData(await api.updateMe(form));
      setEditing(false);
      toast.success('Profile saved.');
    } catch (err) {
      setFormError(friendlyError(err));
    } finally { setSaving(false); }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader title="My Profile" subtitle="This is how other students see you."
        actions={!editing && <Button variant="secondary" onClick={() => setEditing(true)}>Edit profile</Button>} />
      <section className="card">
        <div className="profile-head">
          <Avatar name={profile.name} size={68} />
          <div><h2>{profile.name}</h2><p className="muted">{profile.email}</p></div>
        </div>
        {editing ? (
          <form onSubmit={save} style={{ marginTop: 22 }}>
            {formError && <div className="note note-error" role="alert">{formError}</div>}
            <Field label="Name" id="name" value={form.name} onChange={set('name')} required maxLength={80} />
            <Field label="Student ID" id="studentId" value={form.studentId} onChange={set('studentId')} maxLength={30} hint="Optional. Shown on your profile." />
            <Field label="Short bio" id="bio" hint={`${form.bio.length}/300`}>
              <textarea id="bio" value={form.bio} onChange={set('bio')} maxLength={300} placeholder="Course, interests, what you hope to learn…" />
            </Field>
            <div className="req-actions">
              <Button type="submit" loading={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
              <Button variant="ghost" onClick={() => { setEditing(false); setFormError(''); }} disabled={saving}>Cancel</Button>
            </div>
          </form>
        ) : (
          <dl className="kv">
            <dt>Student ID</dt><dd>{profile.studentId || <span className="muted">Not added yet</span>}</dd>
            
            <dt>Bio</dt><dd>{profile.bio || <span className="muted">Add a short bio so classmates know who you are.</span>}</dd>
          </dl>
        )}
      </section>
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <section className="card panel-teach">
          <div className="card-head"><h2>Can teach</h2><Link to="/skills">Manage</Link></div>
          <div className="chips">{profile.skills.teach.length ? profile.skills.teach.map((s) => <SkillChip key={s.skillId} name={s.name} kind="teach" />) : <span className="muted">No skills added yet.</span>}</div>
        </section>
        <section className="card panel-learn">
          <div className="card-head"><h2>Wants to learn</h2><Link to="/skills">Manage</Link></div>
          <div className="chips">{profile.skills.learn.length ? profile.skills.learn.map((s) => <SkillChip key={s.skillId} name={s.name} kind="learn" />) : <span className="muted">No skills added yet.</span>}</div>
        </section>
      </div>
    </>
  );
}
