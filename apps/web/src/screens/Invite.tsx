import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { family as familyApi } from '../api/client';
import type { InvitationPreviewDto } from '../api/types';
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
  const [preview, setPreview] = useState<InvitationPreviewDto | null>(null);
  const [loading, setLoading] = useState(true);

  /* The token is the credential, so the invitation can be previewed before
     signing in — you should know what you are being offered first (API.md §3).
     This used to call familyApi.invitations(user.id), passing a user id where a
     family id belongs; it only appeared to work because that endpoint ignored
     its argument and returned every invitation in the database. */
  useEffect(() => {
    let alive = true;
    if (!token) { setLoading(false); return; }
    familyApi.invitationPreview(token)
      .then((p) => { if (alive) { setPreview(p); setLoading(false); } })
      .catch(() => { if (alive) { setError('This invitation link is not valid.'); setLoading(false); } });
    return () => { alive = false; };
  }, [token]);

  async function acceptInvite() {
    if (!token) return;
    if (!user) {
      // Come back to this exact link once signed in, token intact.
      nav('/login', { state: { from: `/invite/${token}` } });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await familyApi.acceptInvitation(token);
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
              {preview
                ? <>You've been invited to join <strong>{preview.familyName}</strong> as a <strong>{preview.role}</strong>. Accepting gives you access to the shared tree, stories, and memories.</>
                : 'You\'ve been invited to join a family lineage on FamilyTree.'}
            </p>
            {error && <Alert tone="danger">{error}</Alert>}
            {preview?.expired && <Alert tone="danger">This invitation has expired. Ask a family admin for a new link.</Alert>}
            {preview?.status === 'accepted' && <Alert tone="info">This invitation has already been accepted.</Alert>}
            {(preview?.status === 'revoked' || preview?.status === 'rejected') && (
              <Alert tone="danger">This invitation is no longer open.</Alert>
            )}
            {!user && preview && !preview.expired && preview.status === 'pending' && (
              <Alert tone="info">You'll be asked to sign in first — this link will still be waiting.</Alert>
            )}
            <Button
              onClick={acceptInvite}
              loading={busy}
              disabled={loading || !preview || preview.expired || preview.status !== 'pending'}
              className="ft-btn--xl"
              style={{ width: '100%' }}
            >
              {user ? 'Accept invitation' : 'Sign in to accept'}
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
