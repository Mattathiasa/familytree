import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, family as familyApi } from '../api/client';
import { useApp } from '../app/store';
import { Alert, Button, useToast } from '@ft/ui';
import './auth.css';

export function Invite() {
  const { token } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user, refresh } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!user) {
      nav('/login', { state: { from: window.location.pathname }, replace: true });
    }
  }, [user, nav]);

  async function acceptInvite() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await new Promise<void>((r) => setTimeout(r, 500));
      const invite = (await familyApi.invitations(user?.id ?? '')).find(
        (i) => i.inviteUrl.includes(token) || i.id === token
      );
      if (!invite) {
        setError('This invitation link is invalid or has expired.');
        return;
      }
      if (invite.status === 'accepted') {
        toast.push('You already accepted this invitation.', 'info');
        nav('/families');
        return;
      }
      await familyApi.acceptInvitation(invite.id);
      toast.push('Invitation accepted. Welcome to the family.', 'success');
      refresh();
      setAccepted(true);
      setTimeout(() => nav('/families'), 1200);
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb--tl" aria-hidden="true" />
      <div className="auth-orb auth-orb--br" aria-hidden="true" />
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-header">
          <div className="auth-brand">
            <span className="auth-brand-emblem">🌳</span> FamilyTree
          </div>
          <h1>Family invitation</h1>
        </div>

        {accepted ? (
          <>
            <Alert tone="success">You're now part of the family!</Alert>
            <Button onClick={() => nav('/families')} className="ft-btn--xl" style={{ width: '100%' }}>
              Go to your families
            </Button>
          </>
        ) : (
          <>
            <p className="lede">
              You've been invited to join a family lineage on FamilyTree. Accept this invitation to
              gain access to the shared tree, stories, and memories.
            </p>
            {error && <Alert tone="danger">{error}</Alert>}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <strong>Token:</strong> {token}
            </div>
            <Button onClick={acceptInvite} loading={busy} className="ft-btn--xl" style={{ width: '100%' }}>
              Accept invitation
            </Button>
            <p className="auth-alt" style={{ marginTop: 'var(--space-3)' }}>
              <button type="button" className="ft-link" onClick={() => nav('/families')}>
                No, take me back
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
