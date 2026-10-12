import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../utils/errors';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';
import SkillChip from '../components/SkillChip';
import Button from '../components/Button';

const norm = (s) => s.trim().toLowerCase();

function MatchCard({ card, sent, onSend, sending }) {
  const { match } = card;
  const youLearn = new Set(match.youCanLearn.map(norm));
  const theyLearn = new Set(match.theyCanLearn.map(norm));
  const label = match.type === 'mutual' ? 'Match' : 'Partial match';

  return (
    <article className="match">
      <div className="match-top">
        <Avatar name={card.name} size={46} />
        <div><h3>{card.name}</h3>{card.bio && <p>{card.bio}</p>}</div>
        <div className={`pct pct-${match.type}`}><b>{match.percentage}%</b><small>{label}</small></div>
      </div>
      <div className="bar" aria-hidden="true"><span style={{ width: `${match.percentage}%` }} /></div>

      <div className="swap">
        <div className="swap-side">
          <h4>You can learn</h4>
          {match.youCanLearn.length ? <div className="chips">{match.youCanLearn.map((s) => <SkillChip key={s} name={s} kind="teach" />)}</div> : <span className="none">They don't teach anything on your list yet</span>}
        </div>
        <span className="swap-mid" aria-hidden="true">⇄</span>
        <div className="swap-side">
          <h4>They can learn</h4>
          {match.theyCanLearn.length ? <div className="chips">{match.theyCanLearn.map((s) => <SkillChip key={s} name={s} kind="learn" />)}</div> : <span className="none">They want nothing you teach yet</span>}
        </div>
      </div>

      <dl className="lists">
        <div><dt>Can teach</dt><dd className="chips">{card.teach.map((s) => <SkillChip key={s} name={s} kind="teach" highlight={youLearn.has(norm(s))} />)}</dd></div>
        <div><dt>Wants to learn</dt><dd className="chips">{card.learn.map((s) => <SkillChip key={s} name={s} kind="learn" highlight={theyLearn.has(norm(s))} />)}</dd></div>
      </dl>

      {sent ? <div className="sent-flag">Request sent ({sent.status})</div>
        : <Button onClick={() => onSend(card)} loading={sending} disabled={!match.youCanLearn.length} className="btn-block">
            {sending ? 'Sending…' : 'Send exchange request'}
          </Button>}
    </article>
  );
}

export default function FindSkills() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [sendingId, setSendingId] = useState(null);
  const { data, loading, error, reload, setData } = useFetch(async () => {
    const [matches, sent, skills] = await Promise.all([api.getMatches(), api.getSentRequests(), api.getSkills()]);
    return { matches, sent, hasSkills: skills.length > 0 };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = norm(query);
    if (!q) return data.matches;
    return data.matches.filter((c) => [c.name, ...c.teach, ...c.learn].some((t) => norm(t).includes(q)));
  }, [data, query]);

  if (loading) return <Spinner label="Looking for compatible students…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const openRequestFor = (userId) => data.sent.find((r) => r.toUserId === userId && ['Pending', 'Accepted'].includes(r.status));

  async function send(card) {
    setSendingId(card.userId);
    try {
      const req = await api.sendRequest({ toUserId: card.userId, offeredSkills: card.match.theyCanLearn, requestedSkills: card.match.youCanLearn });
      setData((d) => ({ ...d, sent: [req, ...d.sent] }));
      toast.success(`Request sent to ${card.name}.`);
    } catch (err) {
      toast.error(friendlyError(err));
      if (err.code === 'REQUEST_EXISTS') reload();
    } finally { setSendingId(null); }
  }

  return (
    <>
      <PageHeader title="Find Skills" subtitle="Students whose skills fit yours, best matches first." />
      {!data.hasSkills ? (
        <EmptyState icon="skills" title="Add your skills first" action={<Link to="/skills" className="btn btn-primary">Go to My Skills</Link>}>
          Matches are based on what you can teach and what you want to learn.
        </EmptyState>
      ) : data.matches.length === 0 ? (
        <EmptyState icon="search" title="No compatible students yet" action={<Link to="/skills" className="btn btn-secondary">Update my skills</Link>}>
          Nobody has a skill you want or wants a skill you teach right now. Add more skills or check back as more students join.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or skill" aria-label="Search matches" />
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon="search" title="No results">Nothing matches "{query}". Try a different name or skill.</EmptyState>
          ) : (
            <div className="matches">
              {filtered.map((c) => (
                <MatchCard key={c.userId} card={c} sent={openRequestFor(c.userId)} onSend={send} sending={sendingId === c.userId} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
