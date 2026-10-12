import Button from './Button';
import { friendlyError } from '../utils/errors';

export default function ErrorState({ error, onRetry, title = 'We could not load this' }) {
  return (
    <div className="empty empty-error" role="alert">
      <h3>{title}</h3>
      <p>{friendlyError(error)}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
