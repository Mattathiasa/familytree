import { useState, type FormEvent } from 'react';
import { lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api/client';
import { Alert, Button, Field, Input } from '@ft/ui';
import './auth.css';

const AuthCanvas = lazy(() => import('./AuthScene3D').then((m) => ({ default: m.AuthCanvas })));

const STRENGTH_WIDTH: Record<'weak' | 'medium' | 'strong', string> = {
  weak: '33%',
  medium: '66%',
  strong: '100%',
};

function getPasswordStrength(pw: string): 'weak' | 'medium' | 'strong' {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

export function Register() {
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strength = getPasswordStrength(password);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setErrors({});
    if (password !== confirmPassword) {
      setErrors({ password: 'Passwords don’t match.' });
      setBusy(false);
      return;
    }
    try {
      await auth.register({ displayName, email, password });
      nav('/verify');
    } catch (err) {
      const ex = err as { code?: string; message?: string; fields?: Record<string, string> };
      if (ex.code === 'VALIDATION_FAILED' && ex.fields) setErrors(ex.fields);
      else setFormError(ex.message ?? 'Something went wrong. Please try again.');
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
          <h1>Create your account</h1>
          <p className="lede">Start your family archive. Your email is used only to sign you in.</p>
        </div>

        {formError && <Alert tone="danger">{formError}</Alert>}


        <form onSubmit={onSubmit} noValidate>
          <Field label="Your name" error={errors.displayName} hint="How family members will see you.">
            {(id) => <Input id={id} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" required placeholder="Sara Tesfaye" />}
          </Field>
          <Field label="Email" error={errors.email}>
            {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" />}
          </Field>
          <Field label="Password" error={errors.password} hint="At least 8 characters.">
            {(id) => (
              <>
                <div className="auth-pw-wrapper">
                  <Input
                    id={id}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
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
                {password.length > 0 && (
                  <div className="auth-pw-strength">
                    <div className="auth-pw-strength-bar">
                      <div
                        className={`auth-pw-strength-fill auth-pw-strength--${strength}`}
                        style={{ width: STRENGTH_WIDTH[strength] }}
                      />
                    </div>
                    <span className="auth-pw-strength-label">
                      {strength === 'weak' ? 'Keep going — add more characters & symbols.' :
                       strength === 'medium' ? 'Getting stronger — consider a longer phrase.' :
                       'Strong password — you\'re well protected.'}
                    </span>
                  </div>
                )}
              </>
            )}
          </Field>
          <Field label="Confirm password" error={errors.password}>
            {(id) => (
              <div className="auth-pw-wrapper">
                <Input
                  id={id}
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            )}
          </Field>
          <Button type="submit" loading={busy} className="ft-btn--xl" style={{ width: '100%' }}>Create account</Button>
        </form>

        <p className="auth-alt">Already have an account? <Link to="/login">Sign in</Link></p>
        <p className="auth-demo-note">Demo build — no email is sent; verification is one click.</p>
      </div>
    </div>
  );
}
