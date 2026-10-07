/* The audit trail is the product's trust mechanism (spec §48): "nobody's work
   is ever silently discarded". It is only trustworthy if it is attributed to
   the right person — history() used to ignore its personId argument and return
   every change in the family, so each profile showed the same edits. */

import { describe, expect, it } from 'vitest';
import { people, resetDemoData } from './client';

describe('people.history', () => {
  it('returns only the changes made to the person asked for', async () => {
    resetDemoData();
    const abebe = await people.history('fam-1', 'p-abebe');
    const hana = await people.history('fam-1', 'p-hana');

    expect(abebe.length).toBeGreaterThan(0);
    expect(hana.length).toBeGreaterThan(0);
    expect(abebe.every((h) => h.personId === 'p-abebe')).toBe(true);
    expect(hana.every((h) => h.personId === 'p-hana')).toBe(true);
    expect(abebe.map((h) => h.id)).not.toEqual(hana.map((h) => h.id));
  });

  it('is empty for a person nobody has edited', async () => {
    resetDemoData();
    expect(await people.history('fam-1', 'p-nahom')).toEqual([]);
  });

  it('refuses a person who is not in the family asked about', async () => {
    resetDemoData();
    await expect(people.history('fam-other', 'p-abebe')).rejects.toThrow();
  });

  it('records an edit against the person edited, and nobody else', async () => {
    resetDemoData();
    const before = await people.history('fam-1', 'p-nahom');
    const nahom = await people.get('fam-1', 'p-nahom');
    await people.update('fam-1', 'p-nahom', nahom.version, { occupation: 'Student' });

    const after = await people.history('fam-1', 'p-nahom');
    expect(after.length).toBe(before.length + 1);
    expect(after[0]?.field).toBe('occupation');
    expect(after[0]?.newValue).toBe('Student');

    // The edit must not surface on an unrelated profile.
    const hana = await people.history('fam-1', 'p-hana');
    expect(hana.some((h) => h.newValue === 'Student')).toBe(false);
  });

  it('logs only the fields the edit actually carried', async () => {
    resetDemoData();
    const nahom = await people.get('fam-1', 'p-nahom');
    expect(nahom.birthDate?.year).toBe(2004);

    await people.update('fam-1', 'p-nahom', nahom.version, { occupation: 'Student' });

    const log = await people.history('fam-1', 'p-nahom');
    expect(log.map((h) => h.field)).toEqual(['occupation']);
    // And the untouched value is still there, not quietly cleared.
    expect((await people.get('fam-1', 'p-nahom')).birthDate?.year).toBe(2004);
  });

  it('records a date being deliberately cleared', async () => {
    resetDemoData();
    const nahom = await people.get('fam-1', 'p-nahom');
    await people.update('fam-1', 'p-nahom', nahom.version, { birthDate: null });

    const log = await people.history('fam-1', 'p-nahom');
    expect(log[0]?.field).toBe('birthDate');
    expect(log[0]?.oldValue).toBe('2004');
    expect(log[0]?.newValue).toBe('—');
  });
});
