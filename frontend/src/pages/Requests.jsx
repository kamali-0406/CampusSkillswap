import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../utils/errors';
import { timeAgo } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';
import SkillChip from '../components/SkillChip';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';

function RequestCard({ req, direction, busy, onAction }) {
  const other = direction === 'incoming' ? req.fromName : req.toName;
  // offeredSkills = skills the sender teaches; requestedSkills = skills the sender wants to learn from the recipient.
  const left = { label: direction === 'incoming' ? 'Skills offered to you' : 'Skills you offered', list: req.offeredSkills, kind: 'teach' };
  const right = { label: direction === 'incoming' ? 'Skills requested from you' : 'Skills you requested', list: req.requestedSkills, kind: 'learn' };

  return (
    <article className="req">
      <div className="req-head">
        <Avatar name={other} />
        <div><h3>{direction === 'incoming' ? `From ${other}` : `To ${other}`}</h3><small>{timeAgo(req.createdAt)}</small></div>
        <StatusBadge status={req.status} />
      </div>
      <div className="req-skills">
        <div><h4>{left.label}</h4><div className="chips">{left.list.length ? left.list.map((s) => <SkillChip key={s} name={s} kind={left.kind} />) : <span className="muted">Nothing specific</span>}</div></div>
        <div><h4>{right.label}</h4><div className="chips">{right.list.map((s) => <SkillChip key={s} name={s} kind={right.kind} />)}</div></div>
      </div>
      {req.message && <div className="req-msg">{req.message}</div>}
      <div className="req-actions">
        {direction === 'incoming' && req.status === 'Pending' && (
          <>
            <Button onClick={() => onAction('accept', req)} loading={busy === `accept:${req.requestId}`} disabled={Boolean(busy)}>Accept</Button>
            <Button variant="danger" onClick={() => onAction('reject', req)} loading={busy === `reject:${req.requestId}`} disabled={Boolean(busy)}>Reject</Button>
          </>
        )}
        {req.status === 'Accepted' && (
          <Button variant="secondary" onClick={() => onAction('complete', req)} loading={busy === `complete:${req.requestId}`} disabled={Boolean(busy)}>Mark as completed</Button>
        )}
        {req.status === 'Completed' && <Link to="/ratings" className="btn btn-secondary">Rate this exchange</Link>}
        {direction === 'sent' && req.status === 'Pending' && <span className="muted">Waiting for {other} to respond.</span>}
      </div>
    </article>
  );
}

export default function Requests() {
  const toast = useToast();
  const [tab, setTab] = useState('incoming');
  const [busy, setBusy] = useState(null);
  const { data, loading, error, reload, setData } = useFetch(async () => {
    const [incoming, sent] = await Promise.all([api.getReceivedRequests(), api.getSentRequests()]);
    return { incoming, sent };
  }, []);

  if (loading) return <Spinner label="Loading requests…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  async function act(kind, req) {
    setBusy(`${kind}:${req.requestId}`);
    try {
      const call = { accept: api.acceptRequest, reject: api.rejectRequest, complete: api.completeRequest }[kind];
      const updated = await call(req.requestId);
      const swap = (list) => list.map((r) => (r.requestId === updated.requestId ? updated : r));
      setData((d) => ({ incoming: swap(d.incoming), sent: swap(d.sent) })); // UI updates instantly
      toast.success({ accept: 'Request accepted.', reject: 'Request rejected.', complete: 'Exchange marked as completed.' }[kind]);
    } catch (err) {
      toast.error(friendlyError(err));
      reload(); // state may have changed elsewhere
    } finally { setBusy(null); }
  }

  const list = data[tab === 'incoming' ? 'incoming' : 'sent'];
  const pending = data.incoming.filter((r) => r.status === 'Pending').length;

  return (
    <>
      <PageHeader title="Exchange Requests" subtitle="Reply to requests you received and follow the ones you sent." />
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'incoming'} className={`tab ${tab === 'incoming' ? 'active' : ''}`} onClick={() => setTab('incoming')}>
          Incoming requests{pending > 0 && ` (${pending} new)`}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'sent'} className={`tab ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>
          Sent requests ({data.sent.length})
        </button>
      </div>
      {list.length === 0 ? (
        <EmptyState icon="swap" title={tab === 'incoming' ? 'No incoming requests' : 'You have not sent any requests'}
          action={tab === 'sent' && <Link to="/find" className="btn btn-primary">Find a skill swap</Link>}>
          {tab === 'incoming' ? 'When a student asks to swap skills with you, it will appear here.' : 'Find a compatible student and send your first request.'}
        </EmptyState>
      ) : (
        <div className="req-list">
          {list.map((r) => <RequestCard key={r.requestId} req={r} direction={tab === 'incoming' ? 'incoming' : 'sent'} busy={busy} onAction={act} />)}
        </div>
      )}
    </>
  );
}
