import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './store';
import { RequireFamily, RequireRole } from './guards';
import { ErrorBoundary } from './ErrorBoundary';
import { Landing } from '../screens/Landing';
import { Register } from '../screens/Register';
import { Login } from '../screens/Login';
import { Verify } from '../screens/Verify';
import { ForgotPassword } from '../screens/ForgotPassword';
import { Onboard } from '../screens/Onboard';
import { Invite } from '../screens/Invite';
import { Families } from '../screens/Families';
import { Dashboard } from '../screens/Dashboard';
import { TreeScreen } from '../screens/TreeScreen';
import { People } from '../screens/People';
import { PersonProfile } from '../screens/PersonProfile';
import { PersonEdit } from '../screens/PersonEdit';
import { Stories } from '../screens/Stories';
import { Members } from '../screens/Members';
import { FamilySettings } from '../screens/FamilySettings';
import { Account } from '../screens/Account';
import { Memories } from '../screens/Memories';
import { NotFound } from '../screens/NotFound';
import { canManage } from '@ft/domain';
import '../screens/tree.css';

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('ft.theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ft.theme', theme);
  }, [theme]);
  return (
    <button
      className="ft-icon-btn"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title="Theme"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, familyId, families, roleFor } = useApp();
  const role = roleFor(familyId);
  const famName = families.find((f) => f.id === familyId)?.name ?? 'Family';
  const manage = canManage(role);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="FamilyTree home">
          <span aria-hidden="true">🌳</span> FamilyTree
        </Link>
        <div className="side-family" title={famName}>{famName}</div>
        <nav aria-label="Family">
          <div className="nav-group">Family</div>
          <NavLink to={`/f/${familyId ?? ''}`} end>Dashboard</NavLink>
          <NavLink to={`/f/${familyId ?? ''}/tree`}>Tree</NavLink>
          <NavLink to={`/f/${familyId ?? ''}/people`}>People</NavLink>
          <NavLink to={`/f/${familyId ?? ''}/stories`}>Stories</NavLink>
          <NavLink to={`/f/${familyId ?? ''}/memories`}>Memories</NavLink>
          {manage && (
            <>
              <div className="nav-group">Manage</div>
              <NavLink to={`/f/${familyId ?? ''}/members`}>Members</NavLink>
              <NavLink to={`/f/${familyId ?? ''}/settings`}>Settings</NavLink>
            </>
          )}
          <div className="nav-group">You</div>
          <NavLink to="/account">Account</NavLink>
        </nav>
        <div className="side-footer">
          <ThemeToggle />
        </div>
      </aside>

      <div className="main-col">
        <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
          <span className="topbar-family">{famName}</span>
          <span className="topbar-user">{user?.displayName}</span>
          <ThemeToggle />
        </header>
        <main id="main" className="content">{children}</main>
      </div>

      <nav className="bottombar" aria-label="Quick navigation">
        <NavLink to={`/f/${familyId ?? ''}`} end>Home</NavLink>
        <NavLink to={`/f/${familyId ?? ''}/tree`}>Tree</NavLink>
        <NavLink to={`/f/${familyId ?? ''}/people`}>People</NavLink>
        <NavLink to={`/f/${familyId ?? ''}/stories`}>Stories</NavLink>
        <NavLink to={`/f/${familyId ?? ''}/memories`}>Memories</NavLink>
      </nav>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, ready } = useApp();
  const location = useLocation();
  if (!ready) return <div className="page-loading" aria-busy="true" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Shell>{children}</Shell>;
}

/* Signed in, and a member of the family in the URL. */
function InFamily({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <RequireFamily>{children}</RequireFamily>
    </Protected>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/onboard" element={<Protected><Onboard /></Protected>} />
          <Route path="/invite/:token" element={<Invite />} />

          <Route path="/families" element={<Protected><Families /></Protected>} />
          <Route path="/f/:familyId" element={<InFamily><Dashboard /></InFamily>} />
          <Route path="/f/:familyId/tree" element={<InFamily><TreeScreen /></InFamily>} />
          <Route path="/f/:familyId/people" element={<InFamily><People /></InFamily>} />
          <Route path="/f/:familyId/people/new" element={<InFamily><PersonEdit /></InFamily>} />
          <Route path="/f/:familyId/people/:personId" element={<InFamily><PersonProfile /></InFamily>} />
          <Route path="/f/:familyId/people/:personId/edit" element={<InFamily><PersonEdit /></InFamily>} />
          <Route path="/f/:familyId/memories" element={<InFamily><Memories /></InFamily>} />
          <Route path="/f/:familyId/stories" element={<InFamily><Stories /></InFamily>} />
          <Route path="/f/:familyId/members" element={<InFamily><RequireRole min="admin"><Members /></RequireRole></InFamily>} />
          <Route path="/f/:familyId/settings" element={<InFamily><RequireRole min="admin"><FamilySettings /></RequireRole></InFamily>} />
          <Route path="/account" element={<Protected><Account /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppProvider>
    </ErrorBoundary>
  );
}
