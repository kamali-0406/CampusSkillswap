export default function Field({ label, id, hint, error, children, ...inputProps }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      {children || <input id={id} {...inputProps} />}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
