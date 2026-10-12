import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../utils/errors';
import { timeAgo } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import StarRating from '../components/StarRating';
import Button from '../components/Button';

function RateForm({ req, partner, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!rating) return toast.error('Choose a star rating first.');
    setSaving(true);
    try {
      const saved = await api.createRating({ requestId: req.requestId, rating, feedback });
      toast.success('Thanks for your feedback!');
      onDone(saved);
    } catch (err) {
      toast.error(friendlyError(err));
      setSaving(false);
    }
  }

  return (
    <form className="rate-card" onSubmit={submit}>
      <div><h3>Exchange with {partner}</h3><p className="muted" style={{ fontSize: '.85rem' }}>{[...req.offeredSkills, ...req.requestedSkills].join(', ')}</p></div>
      <StarRating value={rating} onChange={setRating} size={26} />
      <textarea className="inline-input" style={{ borderRadius: 10, minHeight: 80, width: '100%' }} value={feedback} maxLength={500}
        onChange={(e) => setFeedback(e.target.value)} placeholder="What went well? (optional)" aria-label="Feedback" />
      <div><Button type="submit" loading={saving}>{saving ? 'Submitting…' : 'Submit rating'}</Button></div>
    </form>
  );
}

export default function Ratings() {
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useFetch(async () => {
    const [ratings, sent, received] = await Promise.all([api.getRatings(), api.getSentRequests(), api.getReceivedRequests()]);
    return { ratings, completed: [...sent, ...received].filter((r) => r.status === 'Completed') };
  }, []);

  if (loading) return <Spinner label="Loading feedback…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { ratings, completed } = data;
  const rated = new Set(ratings.given.map((r) => r.requestId));
  const toRate = completed.filter((r) => !rated.has(r.requestId));

  const added = (saved) => setData((d) => ({
    ...d, ratings: { ...d.ratings, given: [saved, ...d.ratings.given] }
  }));

  return (
    <>
      <PageHeader title="Ratings & Feedback" subtitle="Rate completed exchanges and see what classmates said about you." />
      <section className="card">
        <div className="card-head"><h2>Waiting for your rating</h2></div>
        {toRate.length === 0 ? (
          <EmptyState icon="star" title="Nothing to rate right now" action={<Link to="/requests" className="btn btn-secondary">View requests</Link>}>
            After an accepted exchange is marked as completed, you can rate it here.
          </EmptyState>
        ) : toRate.map((r) => (
          <RateForm key={r.requestId} req={r} partner={r.fromUserId === user.id ? r.toName : r.fromName} onDone={added} />
        ))}
      </section>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="card-head"><h2>Feedback I received</h2></div>
          {ratings.summary.count > 0 && (
            <div className="big-rating"><b>{ratings.summary.average}</b><StarRating value={Math.round(ratings.summary.average)} /><span className="muted">({ratings.summary.count})</span></div>
          )}
          {ratings.received.length === 0 ? <p className="muted">No feedback yet.</p> : ratings.received.map((r) => (
            <div className="fb" key={r.ratingId}>
              <div><StarRating value={r.rating} size={16} /> <small className="muted">from {r.fromName} · {timeAgo(r.createdAt)}</small></div>
              {r.feedback && <p>{r.feedback}</p>}
            </div>
          ))}
        </section>
        <section className="card">
          <div className="card-head"><h2>Feedback I gave</h2></div>
          {ratings.given.length === 0 ? <p className="muted">You have not rated anyone yet.</p> : ratings.given.map((r) => (
            <div className="fb" key={r.ratingId}>
              <div><StarRating value={r.rating} size={16} /> <small className="muted">for {r.toName} · {timeAgo(r.createdAt)}</small></div>
              {r.feedback && <p>{r.feedback}</p>}
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
