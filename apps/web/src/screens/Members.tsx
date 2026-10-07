import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { family as familyApi } from '../api/client';
import type { InvitationDto, MemberDto } from '../api/types';
import { useApp } from '../app/store';
import { Avatar, Badge, Button, Card, Field, Input, LoadError, Modal, Select, Skeleton, useToast } from '@ft/ui';
import { type Role } from '@ft/domain';

/* Invitations store the path; the shareable link needs the origin, which only
   the browser knows. */
function shareLink(inviteUrl: string): string {
  return inviteUrl.startsWith('http') ? inviteUrl : `${window.location.origin}${inviteUrl}`;
}

export function Members() {
  const { familyId } = useParams();
  const { user, roleFor } = useApp();
  const myRole = roleFor(familyId);
  const toast = useToast();
  const [members, setMembers] = useState<MemberDto[] | null>(null);
  const [invites, setInvites] = useState<InvitationDto[] | null>(null);
  const [inviting, setInviting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoadError(false);
    Promise.all([familyApi.members(familyId!), familyApi.invitations(familyId!)]).then(([m, i]) => {
      if (!alive) return;
      setMembers(m);
      setInvites(i);
    }).catch(() => {
      if (alive) setLoadError(true);
    });
    return () => { alive = false; };
  }, [familyId, reloadToken]);

  // Role refusal lives in the <RequireRole min="admin"> route guard (app/guards.tsx),
  // which also stops a Viewer's client from ever fetching the member list.

  async function changeRole(userId: string, role: Role) {
    await familyApi.changeRole(familyId!, userId, role);
    toast.push('Role updated.', 'success');
    setMembers(await familyApi.members(familyId!));
  }

  async function removeMember(m: MemberDto) {
    await familyApi.removeMember(familyId!, m.userId);
    toast.push(`${m.name} removed from the family.`, 'success');
    setMembers(await familyApi.members(familyId!));
  }

  async function revoke(inv: InvitationDto) {
    await familyApi.revokeInvitation(familyId!, inv.id);
    toast.push('Invitation revoked.', 'success');
    setInvites(await familyApi.invitations(familyId!));
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Kinship Circle & Access · አባላት</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 1.8rem + 1vw, 2.5rem)', margin: '0 0 6px' }}>
            Family Members
          </h1>
          <p className="sub" style={{ margin: 0 }}>
            Everyone with access to this ancestral record, and their stewardship permissions.
          </p>
        </div>
        <Button onClick={() => setInviting(true)} className="ft-btn--primary">+ Invite a relative</Button>
      </div>

      {/* Role explanation guide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        <div style={{ padding: '8px 12px', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)' }}>
          <strong style={{ color: 'var(--color-accent)' }}>👑 Owner</strong>: Complete stewardship, billing, export & danger zone.
        </div>
        <div style={{ padding: '8px 12px', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)' }}>
          <strong>🛡️ Admin</strong>: Can invite relatives, manage people & relationships.
        </div>
        <div style={{ padding: '8px 12px', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)' }}>
          <strong>✍️ Contributor</strong>: Can add memories, write stories & edit facts.
        </div>
        <div style={{ padding: '8px 12px', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)' }}>
          <strong>👁️ Viewer</strong>: Read-only access to tree, 3D space & vault.
        </div>
      </div>

      {loadError && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <LoadError message="We couldn't load this family's members." onRetry={() => setReloadToken((t) => t + 1)} />
        </div>
      )}

      <Card style={{ marginBottom: 'var(--space-5)' }}>
        <div className="panel-title">Members</div>
        {!members ? (
          loadError ? <p className="muted small">Not loaded.</p> : <Skeleton />
        ) : (
          <table className="member-table">
            <thead>
              <tr><th scope="col">Person</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Joined</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId}>
                  <td>
                    <span className="member-cell">
                      <Avatar name={m.name} size={32} /> {m.name}
                      {m.userId === user?.id && <span className="muted small">(you)</span>}
                    </span>
                  </td>
                  <td className="muted">{m.email}</td>
                  <td>
                    {m.role === 'owner' ? (
                      <Badge tone="accent">Owner</Badge>
                    ) : (
                      <Select
                        aria-label={`Role for ${m.name}`}
                        value={m.role}
                        onChange={(e) => changeRole(m.userId, e.target.value as Role)}
                        disabled={m.userId === user?.id}
                        style={{ minWidth: 130 }}
                      >
                        <option value="admin">Admin</option>
                        <option value="contributor">Contributor</option>
                        <option value="viewer">Viewer</option>
                      </Select>
                    )}
                  </td>
                  <td className="muted small">{new Date(m.joinedAt).toLocaleDateString()}</td>
                  <td>
                    {m.userId !== user?.id && m.role !== 'owner' && (
                      <Button size="sm" variant="ghost" onClick={() => removeMember(m)}>Remove</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <div className="panel-title">Pending invitations</div>
        {!invites ? (
          <Skeleton />
        ) : invites.filter((i) => i.status === 'pending').length === 0 ? (
          <p className="muted small">No pending invitations. Invited relatives gain access only after they accept.</p>
        ) : (
          <ul className="list-tight">
            {invites.filter((i) => i.status === 'pending').map((i) => (
              <li key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>
                  {i.email ? i.email : <em className="muted">Share-link invite</em>}{' '}
                  <Badge tone="neutral">{i.role}</Badge>{' '}
                  <span className="muted small">expires {new Date(i.expiresAt).toLocaleDateString()}</span>
                </span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard?.writeText(shareLink(i.inviteUrl)); toast.push('Invite link copied.'); }}>
                    Copy link
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => revoke(i)}>Revoke</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <InviteModal familyId={familyId!} open={inviting} onClose={async () => { setInviting(false); setInvites(await familyApi.invitations(familyId!)); }} />
    </div>
  );
}

function InviteModal({ familyId, open, onClose }: { familyId: string; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('contributor');
  const [busy, setBusy] = useState(false);
  const [lastInvite, setLastInvite] = useState<InvitationDto | null>(null);

  async function send() {
    setBusy(true);
    try {
      const inv = await familyApi.invite(familyId, { email: email.trim() || undefined, role });
      setLastInvite(inv);
      setEmail('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite a relative">
           {lastInvite ? (
        <>
          <p className="ft-alert ft-alert--success" role="status">
            Invite created{lastInvite.email ? ` for ${lastInvite.email}` : ''}. They'll get access after accepting.
          </p>
          <Field label="Invite link" hint="Share this with anyone — accepting is what grants access.">
            {(id) => <Input id={id} readOnly value={shareLink(lastInvite.inviteUrl)} onFocus={(e) => e.target.select()} />}
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(shareLink(lastInvite.inviteUrl)); toast.push('Link copied.'); }}>Copy link</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </>
      ) : (
        <>
          <Field label="Email" hint="Optional — leave blank to get a shareable link instead.">
            {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="relative@example.com" />}
          </Field>
          <Field label="Role" hint="Contributors can add people and stories. Viewers can only read.">
            {(id) => (
              <Select id={id} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="contributor">Contributor — can add and edit</option>
                <option value="viewer">Viewer — read only</option>
                <option value="admin">Admin — manages the family</option>
              </Select>
            )}
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button loading={busy} onClick={send}>Create invite</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
