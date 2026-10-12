import Logo from './Logo';
import { isDevAuth, missingConfig } from '../config/env';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <section className="auth-brand">
        <Logo size={34} />
        <h2>Trade what you know for what you want to learn.</h2>
        <p>List the skills you can teach and the ones you are curious about. We find students whose lists fit yours, so you can swap lessons instead of paying for them.</p>
        <div className="auth-demo" aria-hidden="true">
          <div><small>Student A teaches</small><b className="t-teach">Video Editing</b><small>wants</small><b className="t-learn">Graphic Design</b></div>
          <span className="auth-swap">⇄</span>
          <div><small>Student B teaches</small><b className="t-teach">Graphic Design</b><small>wants</small><b className="t-learn">Video Editing</b></div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {isDevAuth && <div className="note note-info">Local demo mode. Email codes are not sent: use <b>123456</b> as the verification code.</div>}
          {!isDevAuth && missingConfig.length > 0 && (
            <div className="note note-warn" role="alert">AWS is not configured yet. Add {missingConfig.join(', ')} to <code>frontend/.env.local</code> and restart the dev server.</div>
          )}
          {children}
          {footer && <p className="auth-footer">{footer}</p>}
        </div>
      </section>
    </div>
  );
}
