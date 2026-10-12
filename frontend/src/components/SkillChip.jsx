import Icon from './Icon';

/** kind: 'teach' | 'learn' | 'neutral'. Optional edit/remove handlers render small action buttons. */
export default function SkillChip({ name, kind = 'neutral', onEdit, onRemove, highlight = false, disabled = false }) {
  return (
    <span className={`chip chip-${kind} ${highlight ? 'chip-hl' : ''}`}>
      {name}
      {onEdit && <button type="button" className="chip-btn" onClick={onEdit} disabled={disabled} aria-label={`Edit ${name}`}><Icon name="edit" size={13} /></button>}
      {onRemove && <button type="button" className="chip-btn" onClick={onRemove} disabled={disabled} aria-label={`Remove ${name}`}><Icon name="x" size={13} /></button>}
    </span>
  );
}
