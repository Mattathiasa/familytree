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
  const [rememberMe, setRememberMe] = useState(false);
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
      if (rememberMe) {
        localStorage.setItem('ft.remember', '1');
      }
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

  async function socialLogin(provider: string) {
    setBusy(true);
    setFormError(null);
    try {
      await new Promise<void>((r) => setTimeout(r, 400));
      await auth.login({ email: `demo@${provider}.com`, password: 'demo-password' });
      const from = (location.state as { from?: string } | null)?.from;
      nav(from ?? '/families', { replace: true });
    } catch {
      setFormError('Social sign-in is a UI demo in this build.');
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

        <div className="auth-social-row">
          <button type="button" className="ft-btn ft-btn--ghost auth-social-btn" onClick={() => socialLogin('google')} disabled={busy}>
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path fill="currentColor" d="M30.537 16.24c0-1.035-.086-2.04-.27-3.015H16v5.933h8.255c-.353 1.565-1.414 2.917-3.037 3.73-.25.122-1.748 2.808-1.95 3.185-.05.098-.787 1.532-1.728 3.339-1.256 2.217-2.176 3.338-2.767 3.376-.19.015-.38-.02-1.465-.746l-.136-.078c-2.935-1.72-5.338-4.126-7.04-7.05-1.634-2.824-2.68-5.943-3.058-9.193-.03-.296-.05-.59-.05-.883 0-2.574.488-5.007 1.44-7.225.22-.518.657-1.036 1.183-1.48.49-.41.59-.42.82-.08.155.226.48 1.032 1.535 2.903.262.433.43.748.483.834.06.095.07.103.021-.076-.04-.15-.18-1.068-.31-2.041-.035-.285-.07-.502-.07-.513 0-.012.1-.27.223-.57.25-.637.377-.78 1.318-1.224.7-.34 2.058-.935 3.022-1.308 1.837-.75 3.77-.974 5.748-.66.41.064.766.16 1.066.323 1.678.888 3.115 2.18 4.17 3.76 1.19.18 2.514.438 3.697.61.243.035.418.062.437.05.017-.008.133-.19 1.413-3.66.27-.714 1.04-1.703 1.728-2.215.988-.75 1.81-1.016 2.59-1.016h.002c.744 0 1.353.197 1.868.614.13.123.84 1.082 2.275 3.014.227.304.64.852 1.155 1.39.705.784 1.526.98 2.304.98.718 0 1.25-.194 1.635-.713.795-1.003 1.635-1.003 2.486-.002.744.033-.1.193-.134.29-.057.09-.117.31-.146.32-.032.007.118.288.33 4.742.236.526.448 1.088.64 1.693.152.468.463 1.326.705 1.932.06.146.116.31.127.364.016.063-.202.118-.348.236-.157.123-.468.31-.688.41-.324.144-.384.173-.35.076.022-.07.093-.288.16-4.062l.11-3.12c.012-.326.358-4.288.478-6.704.003-.187.02-.29.07-.35.033-.034.093.042.113.09.032.073-.47.448-.288 3.23-.177.17-.057.42-.057.42z"/>
            </svg>
            Google
          </button>
          <button type="button" className="ft-btn ft-btn--ghost auth-social-btn" onClick={() => socialLogin('apple')} disabled={busy}>
            <svg width="18" height="18" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
              <path d="M318.3 309.2c-.7-2.8-3.9-8.8-7.4-11.6-4.3-3.5-8.7-3.1-11.2-3.1-2.6 0-6.8.1-10.8-.2-6.5-.5-10.6-3.1-13.4-3-3.1.1-6.3-.1-9.3-.1-3 0-6.2.1-9.3.2-.3 0-.6-.1-.8-.1-.6.1-1.6.3-2.6.1-2.1-.4-2.8.1-2.8.1-1 .1-2.1-.1-3.2-.5-1.4-.8-1.9-2.1-2-3.2-.3-1.9.6-3.6 2.7-3.3.4 0 .8.1 1.2.1 1-.1 2.2-.6 3.4-1.5 1.3-1 2.7-1.7 2.7-3.2h-.3c-1.3-1.7-3.3-3-3.3-3h-.2c-1.2 0-2.4-.4-2.4-.4-1.6-.9-3.2 1.3-3.2 1.3-1 1.1-2 2.3-2 3.7-.2 2.3-.4 3.6-.1 4.9.2 1.5 1.2 2.8 2.6 3.3.3.1.6.1.9.2-2 .2-3.5.8-4.7 1.9-.7.6-1.5 1.3-1.5 2.1 0 .8.3 1.6.8 2.3 1.2 1.8 3.4 2.4 5.6 2.2 1.8-.1 3.4-.8 4.7-1.9.3-.3.7-.6.9-.9 0-.3.2-.6.2-.9 0-.3.2-.6.4-.8.2-.2.4-.3.7-.4.6-.1 1.3-.1 1.9.2.2 0 .4.1.7.1.2.2.5.3.8.4.8.3 1.7.6 2.6.7.3 0 .6.1.9.1h.1c.2 0 .5-.1.7-.2 1.5-1.3 2.3-3.2 3.8-4.7.3-.3.6-.6.8-.9 0 0 .1 0 .2-.2 1.2-1.2 1.2-1.7 1.3-2.6.1-1 0-2 0-2.9.1-1.1 0-2.1-.1-3.2 0-1.3-.7-2.4-1.6-3.1-2.4-1-1.8-.7-2.3.1-.7.1-.1.2-.2.4-.2.2 0 .4-.1.5-.1.2-.1.4-.1.6-.1.5-.1 1-.1 1.5.1.1 0 .1-.1.2-.1.4 0 .8.1 1.2.1.4 0 .8-.1 1.2-.2.1-.1.3-.1.5-.1.2 0 .3-.1.4-.1.2-.1.4-.1.5-.1.2 0 .4-.1.5-.1.1 0 .1-.1.2-.1.2-.1.3-.1.5-.1.2 0 .4-.1.6-.1.4 0 .7-.1 1.1-.2.3-.1.6-.1.9-.1.3 0 .6-.1.8-.1.3 0 .6-.1.8-.1.3 0 .6-.1.8-.1.2 0 .3-.1.5-.1.3 0 .5-.1.8-.1.2 0 .4-.1.6-.1.2 0 .4-.1.6-.1.1-.1.3-.1.5-.1.1 0 .2 0 .3-.1.1 0 .2-.1.3-.1z"/>
            </svg>
            Apple
          </button>
        </div>

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

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
          <div className="auth-remember-row">
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
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
