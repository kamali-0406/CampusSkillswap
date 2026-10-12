import { useState } from 'react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../utils/errors';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import SkillChip from '../components/SkillChip';
import Button from '../components/Button';
import Icon from '../components/Icon';

function SkillPanel({ type, title, hint, placeholder, skills, onChange }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // { id, value }
  const [error, setError] = useState('');

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(''); setAdding(true);
    try {
      const skill = await api.addSkill(type, name);
      onChange((list) => [...list, skill]);
      setName('');
      toast.success(`Added ${skill.name}.`);
    } catch (err) { setError(friendlyError(err)); } finally { setAdding(false); }
  }

  async function remove(skill) {
    setBusyId(skill.skillId);
    try {
      await api.removeSkill(skill.skillId);
      onChange((list) => list.filter((s) => s.skillId !== skill.skillId));
      toast.success(`Removed ${skill.name}.`);
    } catch (err) { toast.error(friendlyError(err)); } finally { setBusyId(null); }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setBusyId(editing.id);
    try {
      const updated = await api.updateSkill(editing.id, editing.value);
      onChange((list) => list.map((s) => (s.skillId === updated.skillId ? updated : s)));
      setEditing(null);
      toast.success('Skill updated.');
    } catch (err) { toast.error(friendlyError(err)); } finally { setBusyId(null); }
  }

  return (
    <section className={`card panel-${type}`}>
      <div className="card-head"><div><h2>{title}</h2><p className="muted" style={{ fontSize: '.85rem' }}>{hint}</p></div></div>
      <div className="chips" aria-live="polite">
        {skills.length === 0 && <span className="muted">Nothing here yet. Add your first skill below.</span>}
        {skills.map((s) => editing?.id === s.skillId ? (
          <form key={s.skillId} className="skill-edit" onSubmit={saveEdit}>
            <input className="inline-input" autoFocus value={editing.value} maxLength={60} aria-label={`Rename ${s.name}`}
              onChange={(e) => setEditing({ ...editing, value: e.target.value })} />
            <Button type="submit" loading={busyId === s.skillId} className="chip-save"><Icon name="check" size={14} /></Button>
            <Button variant="ghost" onClick={() => setEditing(null)} aria-label="Cancel edit"><Icon name="x" size={14} /></Button>
          </form>
        ) : (
          <SkillChip key={s.skillId} name={s.name} kind={type} disabled={busyId === s.skillId}
            onEdit={() => setEditing({ id: s.skillId, value: s.name })} onRemove={() => remove(s)} />
        ))}
      </div>
      <form className="skill-form" onSubmit={add}>
        <input className="inline-input" style={{ width: 'auto', borderRadius: 10 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} maxLength={60} aria-label={title} />
        <Button type="submit" loading={adding} disabled={!name.trim()}><Icon name="plus" /> Add skill</Button>
      </form>
      {error && <div className="note note-error" role="alert">{error}</div>}
    </section>
  );
}

export default function MySkills() {
  const { data, loading, error, reload, setData } = useFetch(() => api.getSkills(), []);
  if (loading) return <Spinner label="Loading your skills…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const forType = (type) => data.filter((s) => s.type === type);
  const updater = (type) => (fn) => setData((all) => [...all.filter((s) => s.type !== type), ...fn(all.filter((s) => s.type === type))]);

  return (
    <>
      <PageHeader title="My Skills" subtitle="Type any skill you like. We match on what you enter, not on a fixed list." />
      <div className="grid grid-2">
        <SkillPanel type="teach" title="Skills I can teach" hint="Things you could explain or show someone." placeholder="e.g. Python, Video Editing" skills={forType('teach')} onChange={updater('teach')} />
        <SkillPanel type="learn" title="Skills I want to learn" hint="Things you would love a classmate to teach you." placeholder="e.g. Java, Graphic Design" skills={forType('learn')} onChange={updater('learn')} />
      </div>
    </>
  );
}
