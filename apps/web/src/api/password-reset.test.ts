/* FR-4: password reset via a single-use, expiring token. The screen told the
   user "check the console for the token" and nothing was ever logged —
   sendPasswordReset validated the email format, did `void db`, and returned. */

import { beforeEach, describe, expect, it } from 'vitest';
import { auth, resetDemoData } from './client';

beforeEach(() => {
  resetDemoData();
});

describe('requesting a reset', () => {
  it('refuses a malformed address', async () => {
    await expect(auth.sendPasswordReset('not-an-email')).rejects.toThrow();
    await expect(auth.sendPasswordReset('')).rejects.toThrow();
  });

  it('issues a token that expires in an hour', async () => {
    const { token, expiresAt } = await auth.sendPasswordReset('sara@example.com');
    expect(token.length).toBeGreaterThan(8);
    const minutes = (Date.parse(expiresAt) - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(55);
    expect(minutes).toBeLessThanOrEqual(60);
  });

  it('invalidates an outstanding link when a new one is requested', async () => {
    const first = await auth.sendPasswordReset('sara@example.com');
    const second = await auth.sendPasswordReset('sara@example.com');

    await expect(auth.checkPasswordReset(first.token)).rejects.toThrow();
    expect((await auth.checkPasswordReset(second.token)).email).toBe('sara@example.com');
  });
});

describe('using a reset link', () => {
  it('refuses a token that does not exist', async () => {
    await expect(auth.checkPasswordReset('fabricated')).rejects.toThrow();
  });

  it('is single use — the second attempt is refused', async () => {
    const { token } = await auth.sendPasswordReset('sara@example.com');
    await auth.completePasswordReset(token, 'a-long-enough-password');

    await expect(auth.checkPasswordReset(token)).rejects.toThrow();
    await expect(auth.completePasswordReset(token, 'another-password')).rejects.toThrow();
  });

  it('enforces the password rule, and does not spend the token on a rejected attempt', async () => {
    const { token } = await auth.sendPasswordReset('sara@example.com');
    await expect(auth.completePasswordReset(token, 'short')).rejects.toThrow();

    // Still usable, because nothing succeeded.
    expect((await auth.checkPasswordReset(token)).email).toBe('sara@example.com');
    await auth.completePasswordReset(token, 'a-long-enough-password');
  });
});

describe('resending verification', () => {
  it('reports that nothing was sent rather than claiming success', async () => {
    const result = await auth.resendVerification();
    expect(result.sent).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('needs a session', async () => {
    await auth.logout();
    await expect(auth.resendVerification()).rejects.toThrow();
  });
});

describe('notification preferences', () => {
  it('persists a change instead of resetting on reload', async () => {
    const before = await auth.session();
    expect(before.user?.notifications?.weeklyDigest ?? false).toBe(false);

    await auth.updateProfile({ notifications: { weeklyDigest: true } });

    const after = await auth.session();
    expect(after.user?.notifications?.weeklyDigest).toBe(true);
    // And leaves the others alone.
    expect(after.user?.notifications?.contentAdded).toBe(true);
  });

  it('can switch every reminder off — each is individually disableable', async () => {
    await auth.updateProfile({ notifications: { contentAdded: false, occasions: false, weeklyDigest: false } });
    const { user } = await auth.session();
    expect(user?.notifications).toEqual({ contentAdded: false, occasions: false, weeklyDigest: false });
  });
});
