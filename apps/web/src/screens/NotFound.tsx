import { Link } from 'react-router-dom';
import { useApp } from '../app/store';

/* An unknown URL used to bounce silently to the landing page, which reads as
   "the app logged me out" rather than "that address doesn't exist". */
export function NotFound() {
  const { user, familyId } = useApp();
  const home = user ? (familyId ? `/f/${familyId}` : '/families') : '/';

  return (
    <div className="error-page">
      <div className="error-page-inner">
        <div className="eyebrow" style={{ color: 'var(--color-accent)' }}>Not found</div>
        <h1>There's nothing at this address</h1>
        <p className="muted">
          The link may be out of date, or the page may have been removed. Everything in your family
          archive is still where you left it.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
          <Link to={home} className="ft-btn ft-btn--primary">
            {user ? 'Back to your family' : 'Go to the start'}
          </Link>
          {user && <Link to="/families" className="ft-btn ft-btn--ghost">All families</Link>}
        </div>
      </div>
    </div>
  );
}
