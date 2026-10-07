import { useState, type FormEvent } from 'react';
import { lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../api/client';
import { Alert, Button, Field, Input } from '@ft/ui';
import './auth.css';

const AuthCanvas = lazy(() => import('./AuthScene3D').then((m) => ({ default: m.AuthCanvas })));

export function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setErrors({});
    try {
      await auth.login({ email, password });
      const from = (location.state as { from?: string } | null)?.from;
      nav(from ?? '/families', { replace: true });
    } catch (err) {
      const ex = err as { code?: string; message?: string; fields?: Record<string, string> };
      if (ex.code === 'VALIDATION_FAILED' && ex.fields) setErrors(ex.fields);
      else setFormError('That email or password doesn\'t match. Please try again.');
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
          <h1>Welcome back</h1>
          <p className="lede">Sign in to your family archive.</p>
        </div>

        {formError && <Alert tone="danger">{formError}</Alert>}


        <form onSubmit={onSubmit} noValidate>
          <Field label="Email" error={errors.email}>
            {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" />}
          </Field>
          <Field label="Password" error={errors.password}>
            {(id) => (
              <>
                <div className="auth-pw-wrapper">
                  <Input
                    id={id}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </>
            )}
          </Field>
          {/* "Remember me" wrote localStorage['ft.remember'] that nothing ever
              read, and session lifetime is a server-side concern the mock has
              no notion of — you are kept signed in either way. Offering the
              choice was the dishonest part; it returns with real sessions
              (ARCHITECTURE.md §4.1). */}
          <div className="auth-remember-row">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <Button type="submit" loading={busy} className="ft-btn--xl" style={{ width: '100%' }}>Sign in</Button>
        </form>

        <div className="auth-foot">
          <p className="auth-alt">New here? <Link to="/register">Create an account</Link></p>
          <p className="auth-demo-note">Demo build — any email and password opens the seeded demo family.</p>
        </div>
      </div>
    </div>
  );
}
