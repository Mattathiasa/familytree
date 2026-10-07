/* PersonProfile rendered Edit and Remove unconditionally, so a Viewer was
   offered both. These predicates existed in the client and were imported
   nowhere. They mirror the server-side rule (SECURITY.md §11.4) — the client
   copy is a convenience, not the control. */

import { describe, expect, it } from 'vitest';
import { canAddPeople, canDeletePerson, canEditPerson, claimedPerson } from './client';
import type { PersonDto, SessionUser } from './types';

const user: SessionUser = {
  id: 'u-1', email: 'sara@example.com', displayName: 'Sara Tesfaye',
  emailVerified: true, locale: 'en',
};

const person = (patch: Partial<PersonDto> = {}): PersonDto => ({
  id: 'p-1', familyId: 'fam-1', givenName: 'Abebe', gender: 'unknown',
  birthDate: null, deathDate: null, isLiving: null,
  biography: '', occupation: '', birthPlace: '', deathPlace: '',
  photoUrl: null, visibility: 'family', version: 1, createdBy: 'u-2',
  createdAt: '', updatedAt: '', ...patch,
});

describe('canEditPerson', () => {
  it('refuses a viewer', () => {
    expect(canEditPerson('viewer', person(), user)).toBe(false);
  });

  it('allows a contributor on a family-visible record', () => {
    expect(canEditPerson('contributor', person(), user)).toBe(true);
  });

  it('refuses a contributor on someone else\'s private record', () => {
    expect(canEditPerson('contributor', person({ visibility: 'private' }), user)).toBe(false);
  });

  it('allows a contributor on their own private record', () => {
    expect(canEditPerson('contributor', person({ visibility: 'private', createdBy: user.id }), user)).toBe(true);
  });

  it('allows an admin regardless of author', () => {
    expect(canEditPerson('admin', person({ visibility: 'private' }), user)).toBe(true);
  });

  it('refuses a non-member and a signed-out visitor', () => {
    expect(canEditPerson(null, person(), user)).toBe(false);
    expect(canEditPerson('owner', person(), null)).toBe(false);
  });
});

describe('canDeletePerson', () => {
  it('needs admin — a contributor cannot delete, even their own record', () => {
    expect(canDeletePerson('viewer', person(), user)).toBe(false);
    expect(canDeletePerson('contributor', person(), user)).toBe(false);
    expect(canDeletePerson('contributor', person({ createdBy: user.id }), user)).toBe(false);
  });

  it('allows admin and owner', () => {
    expect(canDeletePerson('admin', person(), user)).toBe(true);
    expect(canDeletePerson('owner', person(), user)).toBe(true);
  });
});

describe('canAddPeople', () => {
  it('needs contributor — adding a person is a write on the family', () => {
    expect(canAddPeople(null)).toBe(false);
    expect(canAddPeople('viewer')).toBe(false);
    expect(canAddPeople('contributor')).toBe(true);
    expect(canAddPeople('admin')).toBe(true);
    expect(canAddPeople('owner')).toBe(true);
  });
});

describe('claimedPerson', () => {
  const list = [person({ id: 'p-1' }), person({ id: 'p-2', userId: 'u-1' })];

  it('finds the record this account has claimed', () => {
    expect(claimedPerson(list, user)?.id).toBe('p-2');
  });

  it('is null when nobody has claimed a profile, so no kinship is asserted', () => {
    expect(claimedPerson([person({ id: 'p-1' })], user)).toBeNull();
    expect(claimedPerson(list, null)).toBeNull();
  });
});
