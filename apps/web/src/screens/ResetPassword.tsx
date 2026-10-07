import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { auth } from '../api/client';
import { Alert, Button, Field, Input } from '@ft/ui';
import './auth.css';

const AuthCanvas = lazy(() => import('./AuthScene3D').then((m) => ({ default: m.AuthCanvas })));

/* The other half of FR-4. ForgotPassword told the user a reset link had been
   sent and there was nowhere for such a link to land — no route, no screen.
   The token is checked before the form is shown, so an expired or already-used
   link says so instead of accepting a password and discarding it. */
export function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!token) { setChecking(false); setError('This reset link is not valid.'); return; }
    auth.checkPasswordReset(token)
      .then((r) => { if (alive) { setEmail(r.email); setChecking(false); } })
      .catch((err: Error) => { if (alive) { setError(err.message); setChecking(false); } });
    return () => { alive = false; };
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (password !== confirm) { setError('Those passwords don\'t match.'); return; }
    setBusy(true);
    setError(null);
    try {
      await auth.completePasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb--tl" aria-hidden="true" />
      <div className="auth-orb auth-orb--br" aria-hidden="true" />
      <div className="auth-canvas-bg" aria-hidden="true">
        <Suspense fallback={null}>
          <AuthCanvas />
        </Suspense>
      </div>
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <span className="auth-brand-emblem">🌳</span> FamilyTree
          </div>

          {done ? (
            <>
              <h1>Password updated</h1>
              <p className="lede">You can sign in with your new password now. This link has been used up.</p>
              <Button onClick={() => nav('/login')} className="ft-btn--xl" style={{ width: '100%' }}>Sign in</Button>
            </>
          ) : checking ? (
            <p className="lede" aria-busy="true">Checking your reset link…</p>
          ) : !email ? (
            <>
              <h1>This link won't work</h1>
              <Alert tone="danger">{error ?? 'This reset link is not valid.'}</Alert>
              <Link to="/forgot-password" className="ft-btn ft-btn--primary ft-btn--xl" style={{ width: '100%' }}>
                Request a new link
              </Link>
            </>
          ) : (
            <>
              <h1>Choose a new password</h1>
              <p className="lede">Resetting the password for <strong>{email}</strong>.</p>
              {error && <Alert tone="danger">{error}</Alert>}
              <form onSubmit={onSubmit} noValidate>
                <Field label="New password" hint="At least 8 characters.">
                  {(id) => (
                    <Input id={id} type="password" value={password} autoComplete="new-password"
                      onChange={(e) => setPassword(e.target.value)} required />
                  )}
                </Field>
                <Field label="Confirm new password">
                  {(id) => (
                    <Input id={id} type="password" value={confirm} autoComplete="new-password"
                      onChange={(e) => setConfirm(e.target.value)} required />
                  )}
                </Field>
                <Button type="submit" loading={busy} className="ft-btn--xl" style={{ width: '100%' }}>
                  Update password
                </Button>
              </form>
              <p className="auth-demo-note">
                Demo build — sign-in accepts any password, so this records the reset without checking it later.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
