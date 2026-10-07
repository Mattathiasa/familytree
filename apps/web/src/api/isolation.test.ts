/* Cross-tenant isolation is the first release-gating security test
   (SECURITY.md §11.1): a member of family A must not read — or infer the
   existence of — anything in family B, by any endpoint, including by direct id.

   Every family-scoped endpoint except people and relationships used to `void`
   its familyId and return the whole table, and several mutations ignored it
   too: removeMember dropped the user from every family they belonged to. This
   was invisible while the app could only ever show families[0]; it became a
   live leak the moment family switching started working. */

import { beforeEach, describe, expect, it } from 'vitest';
import { family as familyApi, familyDbCreate, people, relationships, resetDemoData } from './client';

const OTHER = 'fam-outsider';

beforeEach(() => {
  resetDemoData();
});

describe('a family the user does not belong to', () => {
  const reads: Array<[string, () => Promise<unknown>]> = [
    ['people.list', () => people.list(OTHER)],
    ['people.get', () => people.get(OTHER, 'p-abebe')],
    ['people.create', () => people.create(OTHER, { givenName: 'Intruder' })],
    ['people.update', () => people.update(OTHER, 'p-abebe', 1, { occupation: 'x' })],
    ['people.remove', () => people.remove(OTHER, 'p-abebe')],
    ['people.history', () => people.history(OTHER, 'p-abebe')],
    ['relationships.list', () => relationships.list(OTHER)],
    ['relationships.create', () => relationships.create(OTHER, { fromPersonId: 'p-abebe', toPersonId: 'p-hana', kind: 'parent' })],
    ['relationships.remove', () => relationships.remove(OTHER, 'r1')],
    ['family.relatives', () => familyApi.relatives(OTHER, 'p-abebe')],
    ['family.tree', () => familyApi.tree(OTHER)],
    ['family.stats', () => familyApi.stats(OTHER)],
    ['family.memories', () => familyApi.memories(OTHER)],
    ['family.deleteMemory', () => familyApi.deleteMemory(OTHER, 'mem-1')],
    ['family.activity', () => familyApi.activity(OTHER)],
    ['family.upcoming', () => familyApi.upcoming(OTHER)],
    ['family.members', () => familyApi.members(OTHER)],
    ['family.removeMember', () => familyApi.removeMember(OTHER, 'u-2')],
    ['family.changeRole', () => familyApi.changeRole(OTHER, 'u-2', 'viewer')],
    ['family.invitations', () => familyApi.invitations(OTHER)],
    ['family.invite', () => familyApi.invite(OTHER, { email: 'x@example.com', role: 'viewer' })],
    ['family.revokeInvitation', () => familyApi.revokeInvitation(OTHER, 'inv-1')],
    ['family.stories', () => familyApi.stories(OTHER)],
    ['family.saveStory', () => familyApi.saveStory(OTHER, { title: 'T', body: 'B' })],
    ['family.saveMemory', () => familyApi.saveMemory(OTHER, { title: 'T', description: '', type: 'photo', url: 'u' })],
  ];

  for (const [name, call] of reads) {
    it(`refuses ${name}`, async () => {
      await expect(call()).rejects.toThrow();
    });
  }
});

describe('two families the user does belong to', () => {
  it('keeps people, stories, members, invitations and activity apart', async () => {
    familyDbCreate('The Other Family', '', 'fam-2');

    await people.create('fam-2', { givenName: 'Kebede' });
    await familyApi.saveStory('fam-2', { title: 'Only in fam-2', body: '…', status: 'published' });
    await familyApi.invite('fam-2', { email: 'new@example.com', role: 'viewer' });

    const [p1, p2] = [await people.list('fam-1'), await people.list('fam-2')];
    expect(p1.some((p) => p.givenName === 'Kebede')).toBe(false);
    expect(p2.map((p) => p.givenName)).toEqual(['Kebede']);

    const [s1, s2] = [await familyApi.stories('fam-1'), await familyApi.stories('fam-2')];
    expect(s1.some((s) => s.title === 'Only in fam-2')).toBe(false);
    expect(s2.map((s) => s.title)).toEqual(['Only in fam-2']);

    const [m1, m2] = [await familyApi.members('fam-1'), await familyApi.members('fam-2')];
    expect(m1.length).toBe(4);
    expect(m2.map((m) => m.userId)).toEqual(['u-1']);

    const [i1, i2] = [await familyApi.invitations('fam-1'), await familyApi.invitations('fam-2')];
    expect(i1.map((i) => i.email)).toEqual(['nahom@example.com']);
    expect(i2.map((i) => i.email)).toEqual(['new@example.com']);

    const a2 = await familyApi.activity('fam-2');
    expect(a2.every((a) => a.familyId === 'fam-2')).toBe(true);
    expect(a2.some((a) => a.summary.includes('Kebede'))).toBe(true);
  });

  it('removes a member from one family only', async () => {
    familyDbCreate('The Other Family', '', 'fam-2');
    await familyApi.removeMember('fam-1', 'u-2');

    expect((await familyApi.members('fam-1')).some((m) => m.userId === 'u-2')).toBe(false);
    // The owner is still a member of the family they just created.
    expect((await familyApi.members('fam-2')).some((m) => m.userId === 'u-1')).toBe(true);
  });

  it('changes a role in one family only', async () => {
    familyDbCreate('The Other Family', '', 'fam-2');
    await familyApi.changeRole('fam-1', 'u-1', 'viewer');

    expect((await familyApi.members('fam-1')).find((m) => m.userId === 'u-1')?.role).toBe('viewer');
    expect((await familyApi.members('fam-2')).find((m) => m.userId === 'u-1')?.role).toBe('owner');
  });
});

describe('story authorship', () => {
  it('refuses an edit by anyone but the author', async () => {
    // st-3 is Mikael's draft (u-3); the signed-in account is u-1.
    await expect(
      familyApi.saveStory('fam-1', { id: 'st-3', title: 'Hijacked', body: 'x' }),
    ).rejects.toThrow();
  });

  it('lets the author edit their own', async () => {
    const mine = await familyApi.saveStory('fam-1', { title: 'Mine', body: 'a' });
    const edited = await familyApi.saveStory('fam-1', { id: mine.id, title: 'Mine, revised', body: 'b' });
    expect(edited.title).toBe('Mine, revised');
    expect(edited.authorId).toBe('u-1');
  });
});
