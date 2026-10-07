/* The invite link's token is its credential (SECURITY.md §12: short expiry,
   single use, revocable). The Invite screen used to look an invitation up by
   calling invitations(user.id) — a user id where a family id belongs — which
   only appeared to work because that endpoint ignored the argument and
   returned every invitation in the database. */

import { beforeEach, describe, expect, it } from 'vitest';
import { auth, family as familyApi, resetDemoData } from './client';

const SEEDED = 'demo9f3ktoken001';

beforeEach(() => {
  resetDemoData();
});

describe('previewing an invitation', () => {
  it('names the family and the role offered, without a session', async () => {
    await auth.logout();
    const preview = await familyApi.invitationPreview(SEEDED);
    expect(preview.familyName).toBe('The Abebe Family');
    expect(preview.role).toBe('contributor');
    expect(preview.status).toBe('pending');
    expect(preview.expired).toBe(false);
  });

  it('refuses a token that does not exist', async () => {
    await expect(familyApi.invitationPreview('not-a-real-token')).rejects.toThrow();
  });
});

describe('accepting an invitation', () => {
  it('needs a session', async () => {
    await auth.logout();
    await expect(familyApi.acceptInvitation(SEEDED)).rejects.toThrow();
  });

  it('marks the invitation accepted and adds the member', async () => {
    await familyApi.acceptInvitation(SEEDED);
    expect((await familyApi.invitationPreview(SEEDED)).status).toBe('accepted');
    expect((await familyApi.members('fam-1')).some((m) => m.userId === 'u-1')).toBe(true);
  });

  it('refuses a revoked invitation', async () => {
    const [inv] = await familyApi.invitations('fam-1');
    await familyApi.revokeInvitation('fam-1', inv!.id);
    await expect(familyApi.acceptInvitation(SEEDED)).rejects.toThrow();
  });

  it('refuses an expired one — expiresAt was stored but never checked', async () => {
    const fresh = await familyApi.invite('fam-1', { email: 'old@example.com', role: 'viewer' });
    // Reach past the API to age it, as time would.
    const invites = await familyApi.invitations('fam-1');
    const target = invites.find((i) => i.id === fresh.id)!;
    target.expiresAt = new Date(Date.now() - 864e5).toISOString();

    expect((await familyApi.invitationPreview(target.token)).expired).toBe(true);
    await expect(familyApi.acceptInvitation(target.token)).rejects.toThrow();
  });

  it('issues a link whose token is the one the lookup uses', async () => {
    const inv = await familyApi.invite('fam-1', { email: 'new@example.com', role: 'viewer' });
    expect(inv.inviteUrl).toBe(`/invite/${inv.token}`);
    expect((await familyApi.invitationPreview(inv.token)).role).toBe('viewer');
  });
});
