import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api/client';
import { Alert, Button } from '@ft/ui';
import './auth.css';

const AuthCanvas = lazy(() => import('./AuthScene3D').then((m) => ({ default: m.AuthCanvas })));

export function Verify() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      await auth.verifyEmail();
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setResending(true);
    setError(null);
    try {
      await new Promise<void>((r) => setTimeout(r, 500));
      // Mock: in production this triggers a real email send
    } catch {
      // noop
    } finally {
      setResending(false);
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
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-header">
          <div className="auth-brand">
            <span className="auth-brand-emblem">🌳</span> FamilyTree
          </div>
          <h1>Verify your email</h1>
        </div>

        {done ? (
          <>
            <Alert tone="success">Email verified — you're all set.</Alert>
            <Button onClick={() => nav('/onboard')} className="ft-btn--xl" style={{ width: '100%' }}>Continue to onboarding</Button>
          </>
        ) : (
          <>
            <p className="lede">
              In production this arrives by email. In this demo, verification is one click.
            </p>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button onClick={verify} loading={busy} className="ft-btn--xl" style={{ width: '100%' }}>Verify now</Button>
            <p className="auth-alt" style={{ marginTop: 'var(--space-3)' }}>
              Didn't receive an email? <button type="button" className="ft-link" onClick={resend} disabled={resending}>
                {resending ? 'Resending…' : 'Resend verification link'}
              </button>
            </p>
            <p className="auth-alt"><Link to="/login">Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
