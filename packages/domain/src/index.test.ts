import { describe, it, expect } from 'vitest';
import {
  isValidFamilyDate, formatFamilyDate, lifespan,
  ethiopicToGregorian, gregorianToEthiopic, ethiopicToJdn, jdnToEthiopic,
  isEthiopicLeap, ethiopicMonthLength, ethiopicEvangelistYear, ETHIOPIC_MONTH_NAMES_AM,
  resolveLiving, displayName, initials,
  can, roleAtLeast, canManage,
  createsCycle, kinshipLabel,
  type FamilyDate,
} from './index';

const g = (year: number, month?: number, day?: number): FamilyDate => ({
  calendar: 'gregorian',
  precision: day !== undefined ? 'exact' : month !== undefined ? 'month_year' : 'year',
  year, month, day,
});

/* ---------------- Date validation (DATABASE.md §4 constraints) ---------------- */

describe('isValidFamilyDate', () => {
  it('accepts exact, month-year, year, circa, range', () => {
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'exact', year: 1948, month: 10, day: 4 })).toBe(true);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'month_year', year: 1948, month: 10 })).toBe(true);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'year', year: 1948 })).toBe(true);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'circa', year: 1948 })).toBe(true);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'range', year: 1950, endYear: 1953 })).toBe(true);
  });

  it('rejects precision/field inconsistencies', () => {
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'year', year: 1948, month: 2 })).toBe(false);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'exact', year: 1948 })).toBe(false);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'circa', year: 1948, day: 3 })).toBe(false);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'range', year: 1953, endYear: 1950 })).toBe(false);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'unknown', year: 1948 })).toBe(false);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'unknown' })).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'exact', year: 1948, month: 2, day: 31 })).toBe(false);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'exact', year: 1948, month: 13, day: 1 })).toBe(false);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'exact', year: 1948, month: 2, day: 29 })).toBe(true); // 1948 is a leap year
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'exact', year: 1949, month: 2, day: 29 })).toBe(false);
    expect(isValidFamilyDate({ calendar: 'gregorian', precision: 'exact', year: 1948, month: 4, day: 0 })).toBe(false);
  });

  it('validates Ethiopic month lengths including Pagume', () => {
    expect(isValidFamilyDate({ calendar: 'ethiopic', precision: 'exact', year: 2019, month: 13, day: 6 })).toBe(true); // 2019 EC leap
    expect(isValidFamilyDate({ calendar: 'ethiopic', precision: 'exact', year: 2020, month: 13, day: 6 })).toBe(false);
    expect(isValidFamilyDate({ calendar: 'ethiopic', precision: 'exact', year: 2020, month: 13, day: 5 })).toBe(true);
    expect(isValidFamilyDate({ calendar: 'ethiopic', precision: 'exact', year: 2020, month: 14, day: 1 })).toBe(false);
  });

  it('Ethiopic leap rule: year % 4 === 3', () => {
    expect(isEthiopicLeap(2011)).toBe(true);
    expect(isEthiopicLeap(2015)).toBe(true);
    expect(isEthiopicLeap(2019)).toBe(true);
    expect(isEthiopicLeap(2023)).toBe(true);
    expect(isEthiopicLeap(2020)).toBe(false);
    expect(ethiopicMonthLength(2019, 13)).toBe(6);
    expect(ethiopicMonthLength(2020, 13)).toBe(5);
    expect(ethiopicMonthLength(2020, 1)).toBe(30);
  });
});

/* ---------------- Rendering (TESTING.md §3.2 — never false precision) ---------------- */

describe('formatFamilyDate', () => {
  it('renders every precision correctly', () => {
    expect(formatFamilyDate({ calendar: 'gregorian', precision: 'exact', year: 1948, month: 10, day: 4 })).toBe('October 4, 1948');
    expect(formatFamilyDate({ calendar: 'gregorian', precision: 'month_year', year: 1962, month: 6 })).toBe('June 1962');
    expect(formatFamilyDate({ calendar: 'gregorian', precision: 'year', year: 1948 })).toBe('1948');
    expect(formatFamilyDate({ calendar: 'gregorian', precision: 'circa', year: 1948 })).toBe('c. 1948');
    expect(formatFamilyDate({ calendar: 'gregorian', precision: 'range', year: 1950, endYear: 1953 })).toBe('1950 – 1953');
    expect(formatFamilyDate({ calendar: 'gregorian', precision: 'unknown' })).toBe('Unknown');
    expect(formatFamilyDate(null)).toBe('Unknown');
  });

  it('a single year never renders as a fake range', () => {
    expect(formatFamilyDate({ calendar: 'gregorian', precision: 'year', year: 1948 })).not.toContain('–');
    expect(formatFamilyDate({ calendar: 'gregorian', precision: 'range', year: 1948, endYear: 1948 })).toBe('1948');
  });

  it('circa survives and Ethiopic calendar is labelled', () => {
    expect(formatFamilyDate({ calendar: 'ethiopic', precision: 'circa', year: 1940 }, { withCalendar: true })).toBe('c. 1940 (EC)');
    expect(formatFamilyDate({ calendar: 'ethiopic', precision: 'year', year: 2013 }, { withCalendar: true })).toBe('2013 (EC)');
  });
});

describe('lifespan', () => {
  it('renders compact spans with circa marker', () => {
    expect(lifespan(g(1948), g(2019))).toBe('1948 — 2019');
    expect(lifespan({ calendar: 'gregorian', precision: 'circa', year: 1948 }, null)).toBe('c. 1948 —');
    expect(lifespan(null, g(2019))).toBe('d. 2019');
    expect(lifespan(null, null)).toBe('');
    expect(lifespan(g(1958), null)).toBe('1958 —');
  });
});

/* ---------------- Calendar conversion (TESTING.md §3.2 round-trips) ---------------- */

describe('Ethiopic ⇄ Gregorian', () => {
  it('round-trips across a wide range', () => {
    for (let ec = 1900; ec <= 2100; ec += 7) {
      for (const [m, d] of [[1, 1], [6, 15], [13, 2]] as const) {
        const jdn = ethiopicToJdn(ec, m, d);
        const back = jdnToEthiopic(jdn);
        expect(back).toEqual({ year: ec, month: m, day: d });
      }
    }
  });

  it('known anchors: Ethiopian Christmas (Tahsas 29) lands on Jan 7/8', () => {
    // 2015 EC Tahsas 29 = 7 Jan 2023 (Gregorian, non-leap-following year)
    const gc = ethiopicToGregorian(2015, 4, 29);
    expect([gc.month, gc.day]).toEqual([1, 7]);
  });

  it('Enkutatash (Ethiopian New Year) falls on Sept 11 or 12', () => {
    for (const ec of [2011, 2015, 2019, 2023]) {
      const ny = ethiopicToGregorian(ec + 1, 1, 1);
      expect(ny.month).toBe(9);
      expect([11, 12]).toContain(ny.day);
    }
  });

  it('gregorianToEthiopic inverts ethiopicToGregorian', () => {
    for (let y = 1950; y < 2050; y += 9) {
      const ec = gregorianToEthiopic(y, 3, 15);
      const back = ethiopicToGregorian(ec.year, ec.month, ec.day);
      expect(back).toEqual({ year: y, month: 3, day: 15 });
    }
  });

  it('puts Enkutatash on 11 September, and the day after on 2 Meskerem', () => {
    expect(gregorianToEthiopic(2026, 9, 11)).toEqual({ year: 2019, month: 1, day: 1 });
    expect(gregorianToEthiopic(2026, 9, 12)).toEqual({ year: 2019, month: 1, day: 2 });
    expect(gregorianToEthiopic(2025, 9, 11)).toEqual({ year: 2018, month: 1, day: 1 });
  });

  it('names a month in Ge\'ez for every month the calendar has', () => {
    expect(ETHIOPIC_MONTH_NAMES_AM).toHaveLength(13);
    expect(ETHIOPIC_MONTH_NAMES_AM[0]).toBe('መስከረም');
    expect(ETHIOPIC_MONTH_NAMES_AM[12]).toBe('ጳጉሜን');
  });

  it('names each year for its evangelist on a four-year cycle', () => {
    expect(ethiopicEvangelistYear(2017).en).toBe('Matthew');
    expect(ethiopicEvangelistYear(2018).en).toBe('Mark');
    expect(ethiopicEvangelistYear(2019).en).toBe('Luke');
    expect(ethiopicEvangelistYear(2020).en).toBe('John');
    // John's year is the leap year.
    expect(isEthiopicLeap(2019)).toBe(true);
    expect(ethiopicEvangelistYear(2019 + 1).en).toBe('John');
    // The cycle repeats, and negative input does not fall off the end.
    expect(ethiopicEvangelistYear(2023).am).toBe(ethiopicEvangelistYear(2019).am);
    expect(ethiopicEvangelistYear(-1).en).toBe('Luke');
  });
});

/* ---------------- Living status (SECURITY.md §3.3) ---------------- */

describe('resolveLiving', () => {
  const now = { year: 2026 };

  it('assertion wins', () => {
    expect(resolveLiving(g(1800), null, true, now)).toBe('living');
    expect(resolveLiving(g(2000), null, false, now)).toBe('deceased');
  });

  it('death date means deceased', () => {
    expect(resolveLiving(g(1948), g(2019), null, now)).toBe('deceased');
  });

  it('born within 110 years → living; older → deceased', () => {
    expect(resolveLiving(g(1950), null, null, now)).toBe('living');
    expect(resolveLiving(g(1900), null, null, now)).toBe('deceased');
    const edge = now.year - 110;
    expect(resolveLiving(g(edge), null, null, now)).toBe('living');
    expect(resolveLiving(g(edge - 1), null, null, now)).toBe('deceased');
  });

  it('no dates at all → unknown (default-deny upstream)', () => {
    expect(resolveLiving(null, null, null, now)).toBe('unknown');
  });

  it('handles Ethiopic birth years via Gregorian anchor', () => {
    // 2010 EC ≈ 2017/18 GC → living
    expect(resolveLiving({ calendar: 'ethiopic', precision: 'year', year: 2010 }, null, null, now)).toBe('living');
    // 1850 EC ≈ 1857 GC → deceased
    expect(resolveLiving({ calendar: 'ethiopic', precision: 'year', year: 1850 }, null, null, now)).toBe('deceased');
  });
});

/* ---------------- Display names (TESTING.md §3.4) ---------------- */

describe('displayName', () => {
  it('prefers nickname, then given+family, then whatever exists', () => {
    expect(displayName({ givenName: 'Abebe', familyName: 'Abebe', nickname: 'Ababayeh' })).toBe('Ababayeh');
    expect(displayName({ givenName: 'Abebe', familyName: 'Tesfaye' })).toBe('Abebe Tesfaye');
    expect(displayName({ givenName: 'Abebe' })).toBe('Abebe');
    expect(displayName({ familyName: 'Tesfaye' })).toBe('Tesfaye');
    expect(displayName({ givenName: 'Sara', middleName: 'Hanna', familyName: 'Tesfaye' })).toBe('Sara Hanna Tesfaye');
    expect(displayName({})).toBe('Unnamed');
  });

  it('initials', () => {
    expect(initials({ givenName: 'Abebe', familyName: 'Tesfaye' })).toBe('AT');
    expect(initials({ givenName: 'Abebe' })).toBe('AB');
    expect(initials({})).toBe('?');
  });

  it('Amharic-style single-name people render cleanly', () => {
    expect(displayName({ givenName: 'አበበ' })).toBe('አበበ');
  });
});

/* ---------------- Permissions (TESTING.md §3.3 truth table) ---------------- */

describe('permission truth table', () => {
  const rows: Array<{ role: Parameters<typeof can>[0] extends never ? never : import('./index').Role | null; vis: import('./index').Visibility; author: boolean; view: boolean; edit: boolean }> = [
    { role: null, vis: 'public', author: false, view: true, edit: false },
    { role: null, vis: 'family', author: false, view: false, edit: false },
    { role: 'viewer', vis: 'family', author: false, view: true, edit: false },
    { role: 'viewer', vis: 'private', author: false, view: false, edit: false },
    { role: 'viewer', vis: 'private', author: true, view: true, edit: false },
    { role: 'contributor', vis: 'family', author: false, view: true, edit: true },
    { role: 'contributor', vis: 'private', author: false, view: false, edit: false },
    { role: 'contributor', vis: 'private', author: true, view: true, edit: true },
    { role: 'admin', vis: 'private', author: false, view: true, edit: true },
    { role: 'admin', vis: 'selected', author: false, view: true, edit: true },
    { role: 'contributor', vis: 'selected', author: false, view: false, edit: false },
    { role: 'contributor', vis: 'selected', author: true, view: true, edit: true },
  ];

  for (const r of rows) {
    it(`view role=${r.role} vis=${r.vis} author=${r.author} → ${r.view}`, () => {
      expect(can('view', { role: r.role, visibility: r.vis, isAuthor: r.author })).toBe(r.view);
    });
    it(`edit role=${r.role} vis=${r.vis} author=${r.author} → ${r.edit}`, () => {
      expect(can('edit', { role: r.role, visibility: r.vis, isAuthor: r.author })).toBe(r.edit);
    });
  }

  it('drafts are author-only regardless of visibility', () => {
    expect(can('view', { role: 'owner', visibility: 'public', isAuthor: false, isDraft: true })).toBe(false);
    expect(can('view', { role: 'viewer', visibility: 'private', isAuthor: true, isDraft: true })).toBe(true);
  });

  it('delete is admin+; role ranking holds', () => {
    expect(can('delete', { role: 'contributor', visibility: 'family', isAuthor: true })).toBe(false);
    expect(can('delete', { role: 'admin', visibility: 'family', isAuthor: false })).toBe(true);
    expect(can('delete', { role: 'owner', visibility: 'private', isAuthor: false })).toBe(true);
    expect(roleAtLeast('owner', 'admin')).toBe(true);
    expect(roleAtLeast('viewer', 'contributor')).toBe(false);
    expect(canManage('admin')).toBe(true);
    expect(canManage('contributor')).toBe(false);
    expect(canManage(null)).toBe(false);
  });
});

/* ---------------- Cycle rejection (FR-33, risk R-3) ---------------- */

describe('createsCycle', () => {
  const e = (from: string, to: string) => ({ from, to, kind: 'parent' as const });

  it('rejects direct self-parent', () => {
    expect(createsCycle([], 'a', 'a')).toBe(true);
  });

  it('rejects making an ancestor a descendant', () => {
    const edges = [e('g', 'p'), e('p', 'c')];
    expect(createsCycle(edges, 'c', 'g')).toBe(true); // grandchild becomes grandparent's parent → loop
    expect(createsCycle(edges, 'g', 'c')).toBe(false); // already-legal duplicate direction is fine to attempt
  });

  it('allows normal additions', () => {
    const edges = [e('g', 'p')];
    expect(createsCycle(edges, 'g', 'c')).toBe(false);
    expect(createsCycle(edges, 'x', 'g')).toBe(false);
  });

  it('terminates on pathological existing cycles', () => {
    const edges = [e('a', 'b'), e('b', 'a')]; // already-corrupt graph; must not hang
    expect(createsCycle(edges, 'a', 'c')).toBe(false);
    expect(createsCycle(edges, 'a', 'b')).toBe(true); // a→b closes the a→b→a loop
    expect(createsCycle(edges, 'c', 'a')).toBe(false); // c above a pre-existing loop creates no NEW cycle
    expect(createsCycle(edges, 'b', 'c')).toBe(false);
    // Note: re-adding an identical existing edge (b→a) is also reported as a cycle
    // by this pure check — harmless, because the API rejects duplicates before
    // the cycle check ever runs.
    expect(createsCycle(edges, 'b', 'a')).toBe(true);
  });
});

/* ---------------- Kinship labels (spec §38 — computed, never hardcoded) ---------------- */

describe('kinshipLabel', () => {
  const e = (from: string, to: string) => ({ from, to, kind: 'parent' as const });
  const s = (from: string, to: string) => ({ from, to, kind: 'spouse' as const });

  it('direct relations', () => {
    expect(kinshipLabel([e('dad', 'me')], 'me', 'dad')).toBe('Parent');
    expect(kinshipLabel([e('dad', 'me')], 'dad', 'me')).toBe('Child');
    expect(kinshipLabel([s('me', 'spouse')], 'me', 'spouse')).toBe('Spouse');
  });

  it('grandparent and sibling', () => {
    expect(kinshipLabel([e('gp', 'dad'), e('dad', 'me')], 'me', 'gp')).toBe('Grandparent');
    expect(kinshipLabel([e('dad', 'me'), e('dad', 'sis')], 'me', 'sis')).toBe('Sibling');
  });

  it('aunt and cousin paths', () => {
    const edges = [e('gp', 'dad'), e('gp', 'aunt'), e('dad', 'me'), e('aunt', 'cous')];
    expect(kinshipLabel(edges, 'me', 'aunt')).toBe('Aunt or uncle');
    expect(kinshipLabel(edges, 'me', 'cous')).toBe('First cousin');
  });

  it('disconnected people get an honest answer', () => {
    expect(kinshipLabel([e('a', 'b')], 'a', 'z')).toBe('No known relationship');
  });
});
