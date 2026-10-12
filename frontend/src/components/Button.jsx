export default function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...rest }) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
      {children}
    </button>
  );
}
