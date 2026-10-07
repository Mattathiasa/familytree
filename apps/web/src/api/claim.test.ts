/* Onboarding asks for your name and says it is how your family will see you,
   then used to create nobody — so step 3 finished on a dashboard and a tree
   with zero people, and Journey A's "see a two-node tree" was unreachable
   from the onboarding path. */

import { describe, expect, it } from 'vitest';
import { claimedPerson, people, resetDemoData } from './client';

describe('creating the person who is you', () => {
  const u1 = { id: 'u-1', email: '', displayName: '', emailVerified: true, locale: 'en' } as const;

  it('claims the record for the signed-in account', async () => {
    resetDemoData();
    // A brand-new family, as onboarding creates one.
    const me = await people.create('fam-new', { givenName: 'Tesfaye', claimedByMe: true });
    expect(me.userId).toBe('u-1');
    expect(claimedPerson(await people.list('fam-new'), u1)?.id).toBe(me.id);
  });

  it('refuses a second claim in the same family, so "me" stays one person', async () => {
    resetDemoData();
    // The seed already has the demo account claiming Sara in fam-1.
    expect(claimedPerson(await people.list('fam-1'), u1)?.id).toBe('p-sara');
    await expect(people.create('fam-1', { givenName: 'Impostor', claimedByMe: true })).rejects.toThrow();
  });

  it('allows a claim in a different family — one account, many families', async () => {
    resetDemoData();
    const elsewhere = await people.create('fam-two', { givenName: 'Sara', claimedByMe: true });
    expect(elsewhere.userId).toBe('u-1');
  });

  it('leaves an ordinary person unclaimed — a historical person has no account', async () => {
    resetDemoData();
    const other = await people.create('fam-1', { givenName: 'Alemu' });
    expect(other.userId).toBeNull();
  });

  it('still requires nothing but a name', async () => {
    resetDemoData();
    const me = await people.create('fam-new', { givenName: 'Sara', claimedByMe: true });
    expect(me.birthDate).toBeNull();
    expect(me.occupation).toBe('');
    expect(me.deathDate).toBeNull();
  });
});

describe('the one required field', () => {
  it('refuses a person with every name part blank', async () => {
    resetDemoData();
    await expect(people.create('fam-1', { givenName: '   ' })).rejects.toThrow();
    await expect(people.create('fam-1', {})).rejects.toThrow();
    await expect(people.create('fam-1', { givenName: '', familyName: '', nickname: '' })).rejects.toThrow();
  });

  it('accepts any single name part on its own', async () => {
    resetDemoData();
    expect((await people.create('fam-1', { familyName: 'Abebe' })).familyName).toBe('Abebe');
    expect((await people.create('fam-1', { nickname: 'Ababayeh' })).nickname).toBe('Ababayeh');
    expect((await people.create('fam-1', { middleName: 'Wolde' })).middleName).toBe('Wolde');
  });

  it('refuses an edit that would blank the name out', async () => {
    resetDemoData();
    const p = await people.get('fam-1', 'p-abebe');
    await expect(
      people.update('fam-1', 'p-abebe', p.version, { givenName: '', familyName: '', nickname: '', middleName: '' }),
    ).rejects.toThrow();
  });

  it('leaves an edit that does not touch the name alone', async () => {
    resetDemoData();
    const p = await people.get('fam-1', 'p-abebe');
    const after = await people.update('fam-1', 'p-abebe', p.version, { occupation: 'Headmaster' });
    expect(after.occupation).toBe('Headmaster');
    expect(after.givenName).toBe('Abebe');
  });
});
