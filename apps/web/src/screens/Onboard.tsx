import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, family as familyApi, familyDbCreate } from '../api/client';
import { useApp } from '../app/store';
import { Alert, Button, Field, Input, Select, Textarea, useToast } from '@ft/ui';
import './auth.css';

const AuthCanvas = lazy(() => import('./AuthScene3D').then((m) => ({ default: m.AuthCanvas })));

type LineageType = 'ethiopian' | 'general';

export function Onboard() {
  const { user, refresh, familyId } = useApp();
  const nav = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [lineageType, setLineageType] = useState<LineageType>('ethiopian');
  const [yourName, setYourName] = useState(user?.displayName ?? '');
  const [yourEmail, setYourEmail] = useState(user?.email ?? '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function next() {
    if (step === 1 && !familyName.trim()) {
      setError('Give your family a name.');
      return;
    }
    if (step === 2 && !yourName.trim()) {
      setError('Enter your name.');
      return;
    }
    setError(null);
    setStep(step + 1);
  }

  async function createFamilyAndFinish() {
    setBusy(true);
    setError(null);
    try {
      const id = `fam-${Date.now().toString(36)}`;
      familyDbCreate(familyName.trim(), '', id);

      if (yourName && yourName !== user?.displayName) {
        await auth.updateProfile({ displayName: yourName });
      }

      if (inviteEmail.trim()) {
        await familyApi.invite(id, { email: inviteEmail.trim(), role: 'contributor' });
        toast.push(`Invite sent to ${inviteEmail.trim()}.`, 'success');
      }

      toast.push(`“${familyName.trim()}” created. Welcome!`, 'success');
      refresh();
      nav(`/f/${id}`);
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const totalSteps = 3;

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
          <h1>Welcome — let's get you started</h1>
          <p className="lede">A three-step wizard to create your family lineage and invite your first relative.</p>
        </div>

        <div className="onboard-steps">
          <div className="onboard-step-bar">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={`onboard-step-dot ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}`}>
                {i + 1 === step ? <span className="onboard-dot-inner" /> : i + 1 < step ? '✓' : i + 1}
              </div>
            ))}
          </div>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        {step === 1 && (
          <>
            <Field label="Family name" hint="For example 'The Abebe Family'." error={step === 1 && !familyName.trim() && error ? error : undefined}>
              {(id) => <Input id={id} value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="The Abebe Family" autoFocus />}
            </Field>
            <Field label="Lineage type" hint="Ethiopian lineage tracks the Ge'ez calendar and kinship terms. General uses Gregorian defaults.">
              {(id) => (
                <Select id={id} value={lineageType} onChange={(e) => setLineageType(e.target.value as LineageType)}>
                  <option value="ethiopian">Ethiopian (Ge'ez calendar, Amharic terms)</option>
                  <option value="general">General (Gregorian calendar)</option>
                </Select>
              )}
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
              <Button variant="ghost" onClick={() => nav('/families')}>Skip for now</Button>
              <Button onClick={next}>Continue</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Your name" hint="How family members will see you.">
              {(id) => <Input id={id} value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="Sara Tesfaye" />}
            </Field>
            <Field label="Your email">
              {(id) => <Input id={id} type="email" value={yourEmail} readOnly placeholder="you@example.com" />}
            </Field>
            <p className="auth-demo-note" style={{ fontSize: 'var(--text-xs)' }}>
              You're the owner of this family. You can always invite others later from the Members page.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 'var(--space-5)' }}>
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={next}>Continue</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Invite a relative (optional)" hint="Enter their email to send a shareable invite link. Skip this to do it later.">
              {(id) => <Input id={id} type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="relative@example.com" />}
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 'var(--space-5)' }}>
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button loading={busy} onClick={createFamilyAndFinish} className="ft-btn--xl">Create family</Button>
            </div>
          </>
        )}

        {familyId && step === 3 && !busy && (
          <Button variant="ghost" onClick={() => nav(`/f/${familyId}`)} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
            Already have a family? Go to it
          </Button>
        )}
      </div>
    </div>
  );
}
