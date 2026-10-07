import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api/client';
import { Alert, Button, Field, Input } from '@ft/ui';
import './auth.css';

const AuthCanvas = lazy(() => import('./AuthScene3D').then((m) => ({ default: m.AuthCanvas })));

export function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await auth.sendPasswordReset(email);
      // No mail transport yet, so the link is shown here rather than promised
      // to a console that nothing ever wrote to.
      setResetLink(`/reset/${token}`);
      setSubmitted(true);
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
          {submitted ? (
            <>
              <h1>Check your email</h1>
              <p className="lede">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link.
                It expires in 60 minutes.
              </p>
              <Alert tone="info">
                Demo build — no email is sent, so here is the link itself. It is single-use and expires in 60 minutes.
              </Alert>
              {resetLink && (
                <Link to={resetLink} className="ft-btn ft-btn--primary ft-btn--xl" style={{ width: '100%' }}>
                  Open the reset link
                </Link>
              )}
              <Button variant="ghost" onClick={() => nav('/login')} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
                Back to sign in
              </Button>
            </>
          ) : (
            <>
              <h1>Forgot password?</h1>
              <p className="lede">Enter your email and we'll send you a link to reset your password.</p>
              {error && <Alert tone="danger">{error}</Alert>}
              <form onSubmit={onSubmit} noValidate>
                <Field label="Email" error={error ?? undefined}>
                  {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" />}
                </Field>
                <Button type="submit" loading={busy} className="ft-btn--xl" style={{ width: '100%' }}>Send reset link</Button>
              </form>
              <p className="auth-alt">
                <Link to="/login">Back to sign in</Link>
              </p>
              <p className="auth-demo-note">Demo build — no email is sent; the reset link appears on the next screen.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
