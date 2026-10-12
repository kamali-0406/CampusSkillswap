import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { joinSkills, timeAgo } from '../utils/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Icon from '../components/Icon';

function activityLine(r, userId) {
  const incoming = r.toUserId === userId;
  if (incoming) {
    return r.status === 'Pending'
      ? `${r.fromName} asked to learn ${joinSkills(r.requestedSkills)} from you`
      : `You ${r.status.toLowerCase()} ${r.fromName}'s request`;
  }
  return `Your request to ${r.toName} for ${joinSkills(r.requestedSkills)} is ${r.status.toLowerCase()}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(async () => {
    const [skills, sent, received] = await Promise.all([api.getSkills(), api.getSentRequests(), api.getReceivedRequests()]);
    return { skills, sent, received };
  }, []);

  if (loading) return <Spinner label="Loading your dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { skills, sent, received } = data;
  const all = [...sent, ...received];
  const count = (status) => all.filter((r) => r.status === status).length;
  const activity = [...all].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 6);
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <>
      <PageHeader title={`Welcome back, ${firstName}`} subtitle="Here is where your skill swaps stand today." />
      <div className="grid grid-stats">
        <StatCard tone="teach" label="Skills you teach" value={skills.filter((s) => s.type === 'teach').length} />
        <StatCard tone="learn" label="Skills you want" value={skills.filter((s) => s.type === 'learn').length} />
        <StatCard label="Pending requests" value={received.filter((r) => r.status === 'Pending').length} hint="waiting for your reply" />
        <StatCard label="Accepted exchanges" value={count('Accepted')} />
        <StatCard tone="ok" label="Completed exchanges" value={count('Completed')} />
      </div>
      <div className="grid grid-2">
        <section className="card">
          <div className="card-head"><h2>Recent activity</h2></div>
          {activity.length === 0 ? (
            <EmptyState icon="swap" title="No activity yet">Send your first exchange request and it will show up here.</EmptyState>
          ) : (
            <ul className="activity">
              {activity.map((r) => (
                <li key={r.requestId}>
                  <span>{activityLine(r, user.id)} <StatusBadge status={r.status} /></span>
                  <small>{timeAgo(r.updatedAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <div className="card-head"><h2>Quick actions</h2></div>
          <div className="quick">
            <Link to="/skills" className="btn btn-secondary"><Icon name="plus" /> Add skills</Link>
            <Link to="/find" className="btn btn-primary"><Icon name="search" /> Find a skill swap</Link>
            <Link to="/requests" className="btn btn-secondary"><Icon name="swap" /> Review requests</Link>
          </div>
        </section>
      </div>
    </>
  );
}
