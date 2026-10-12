import Icon from './Icon';

/** Read-only when onChange is omitted. */
export default function StarRating({ value = 0, onChange, size = 20 }) {
  return (
    <span className="stars" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={`star ${n <= value ? 'on' : ''}`} onClick={onChange ? () => onChange(n) : undefined}
          disabled={!onChange} tabIndex={onChange ? 0 : -1} aria-label={`${n} star${n > 1 ? 's' : ''}`} role={onChange ? 'radio' : undefined} aria-checked={onChange ? n === value : undefined}>
          <Icon name="star" size={size} />
        </button>
      ))}
    </span>
  );
}
