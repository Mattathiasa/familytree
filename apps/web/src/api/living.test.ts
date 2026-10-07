/* Living status is derived, not stored. The seed sets isLiving: null on every
   person, so any screen reading the raw flag reports the whole family as
   ancestors — which is what Dashboard and TreeScreen used to do. */

import { describe, expect, it } from 'vitest';
import { livingStatusOf, livingTally } from './client';
import { seedDb } from './mock-db';
import type { PersonDto } from './types';

const base: PersonDto = {
  id: 'p', familyId: 'f', givenName: 'Test', gender: 'unknown',
  birthDate: null, deathDate: null, isLiving: null,
  biography: '', occupation: '', birthPlace: '', deathPlace: '',
  photoUrl: null, visibility: 'family', version: 1, createdBy: 'u',
  createdAt: '', updatedAt: '',
};

const person = (patch: Partial<PersonDto>): PersonDto => ({ ...base, ...patch });
const year = (y: number) => ({ calendar: 'gregorian' as const, precision: 'year' as const, year: y });

describe('livingStatusOf', () => {
  it('reads a death date as deceased', () => {
    expect(livingStatusOf(person({ deathDate: year(2019) }))).toBe('deceased');
  });

  it('treats a recent-enough birth with no death as living', () => {
    expect(livingStatusOf(person({ birthDate: year(1972) }))).toBe('living');
  });

  it('treats a birth beyond the living window as deceased', () => {
    expect(livingStatusOf(person({ birthDate: year(1850) }))).toBe('deceased');
  });

  it('says unknown when there is nothing to go on', () => {
    expect(livingStatusOf(person({}))).toBe('unknown');
  });

  it('honours an asserted flag over the dates', () => {
    expect(livingStatusOf(person({ birthDate: year(1850), isLiving: true }))).toBe('living');
  });
});

describe('livingTally', () => {
  it('counts the three answers separately', () => {
    const tally = livingTally([
      person({ id: 'a', birthDate: year(1972) }),
      person({ id: 'b', deathDate: year(2019) }),
      person({ id: 'c' }),
    ]);
    expect(tally).toEqual({ living: 1, deceased: 1, unknown: 1 });
  });

  it('does not report the seeded family as entirely deceased', () => {
    const tally = livingTally(seedDb().people);
    expect(tally.living).toBeGreaterThan(0);
    expect(tally.deceased).toBeGreaterThan(0);
    expect(tally.living + tally.deceased + tally.unknown).toBe(seedDb().people.length);
  });
});
