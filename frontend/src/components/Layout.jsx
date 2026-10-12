import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isDevAuth } from '../config/env';
import Icon from './Icon';
import Logo from './Logo';
import Avatar from './Avatar';
import Button from './Button';

const NAV = [
  ['/', 'Dashboard', 'dashboard'],
  ['/profile', 'My Profile', 'user'],
  ['/skills', 'My Skills', 'skills'],
  ['/find', 'Find Skills', 'search'],
  ['/requests', 'Exchange Requests', 'swap'],
  ['/ratings', 'Ratings & Feedback', 'star']
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const handleSignOut = async () => { setSigningOut(true); await signOut(); };

  return (
    <div className="shell">
      <div className="topbar">
        <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" size={22} /></button>
        <Logo size={26} />
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand"><Logo /></div>
        <nav aria-label="Main">
          {NAV.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon name={icon} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          {isDevAuth && <p className="dev-note">Local demo mode: data resets when the API restarts.</p>}
          <div className="me">
            <Avatar name={user?.name} />
            <div className="me-text"><strong>{user?.name}</strong><span>{user?.email}</span></div>
          </div>
          <Button variant="ghost" onClick={handleSignOut} loading={signingOut} className="btn-block"><Icon name="logout" /> Sign out</Button>
        </div>
      </aside>

      <main className="main"><Outlet /></main>
    </div>
  );
}
