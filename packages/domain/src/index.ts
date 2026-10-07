/**
 * FamilyTree — shared domain logic (pure, no IO).
 * Per ARCHITECTURE.md §2: kinship computation, calendar conversion,
 * permission predicates, and date precision live here, import nothing,
 * and are unit-tested exhaustively.
 */

export type CalendarSystem = 'gregorian' | 'ethiopic';
export type DatePrecision = 'exact' | 'month_year' | 'year' | 'circa' | 'range' | 'unknown';

/** Structured date per DATABASE.md §4 `family_date`. Precision is never collapsed. */
export interface FamilyDate {
  calendar: CalendarSystem;
  precision: DatePrecision;
  year?: number;
  month?: number; // 1-12
  day?: number; // 1-31
  endYear?: number; // precision = 'range'
  endMonth?: number;
  endDay?: number;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const ETHIOPIC_MONTH_NAMES = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
] as const;

/** The same months in Ge'ez script, for an Ethiopian-first UI (spec §55). */
export const ETHIOPIC_MONTH_NAMES_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን',
] as const;

/**
 * Which evangelist an Ethiopian year is named for. The names run on a
 * four-year cycle (Matthew, Mark, Luke, John), and the leap year is John's.
 */
export function ethiopicEvangelistYear(year: number): { am: string; en: string } {
  const cycle = [
    { am: 'ዮሐንስ', en: 'John' },
    { am: 'ማቴዎስ', en: 'Matthew' },
    { am: 'ማርቆስ', en: 'Mark' },
    { am: 'ሉቃስ', en: 'Luke' },
  ] as const;
  return cycle[((year % 4) + 4) % 4]!;
}

/** A person is inferred living if born within this window and no death date. */
export const LIVING_WINDOW_YEARS = 110;

// ---------------------------------------------------------------------------
// Validation (DATABASE.md §4 constraints, enforced again at the edge)
// ---------------------------------------------------------------------------

export function isEthiopicLeap(year: number): boolean {
  return year % 4 === 3;
}

export function ethiopicMonthLength(year: number, month: number): number {
  if (month === 13) return isEthiopicLeap(year) ? 6 : 5;
  return 30;
}

export function isValidFamilyDate(d: FamilyDate): boolean {
  if (!d) return false;
  const p = d.precision;
  if (p === 'unknown') return d.year === undefined;
  if (d.year === undefined || !Number.isInteger(d.year)) return false;
  if (p === 'range') return d.endYear !== undefined && d.endYear >= d.year;
  if (p === 'year' || p === 'circa') return d.month === undefined && d.day === undefined;
  if (p === 'month_year') {
    return d.month !== undefined && d.day === undefined && validMonthDay(d.calendar, d.year, d.month, 1);
  }
  if (p === 'exact') {
    if (d.month === undefined || d.day === undefined) return false;
    return validMonthDay(d.calendar, d.year, d.month, d.day);
  }
  return false;
}

function validMonthDay(cal: CalendarSystem, year: number, month: number, day: number): boolean {
  if (month < 1 || day < 1) return false;
  if (cal === 'ethiopic') {
    if (month > 13) return false;
    return day <= ethiopicMonthLength(year, month);
  }
  if (month > 12) return false;
  const gregLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, gregLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}

// ---------------------------------------------------------------------------
// Rendering — a single year never renders as a fake range (TESTING.md §3.2)
// ---------------------------------------------------------------------------

export function formatFamilyDate(d: FamilyDate | null | undefined, opts?: { withCalendar?: boolean }): string {
  if (!d || d.precision === 'unknown') return 'Unknown';
  const cal = d.calendar ?? 'gregorian';
  const parts = (y?: number, m?: number, day?: number): string => {
    if (y === undefined) return '?';
    if (m === undefined) return String(y);
    const monthName =
      cal === 'ethiopic' ? (ETHIOPIC_MONTH_NAMES[m - 1] ?? String(m)) : (MONTH_NAMES[m - 1] ?? String(m));
    return day === undefined ? `${monthName} ${y}` : `${monthName} ${day}, ${y}`;
  };
  const mark = d.precision === 'circa' ? 'c. ' : '';
  let out: string;
  if (d.precision === 'range') {
    out = d.endYear === d.year && d.endMonth === undefined
      ? parts(d.year, d.month, d.day)
      : `${parts(d.year, d.month, d.day)} – ${parts(d.endYear, d.endMonth, d.endDay)}`;
  } else {
    out = `${mark}${parts(d.year, d.month, d.day)}`;
  }
  if (opts?.withCalendar && cal === 'ethiopic') out += ' (EC)';
  return out;
}

/** Compact lifespan line for cards: "1948 — 2019", "c. 1948 —", "b. 1958". */
export function lifespan(birth?: FamilyDate | null, death?: FamilyDate | null): string {
  const b = birth && birth.precision !== 'unknown' ? `${birth.precision === 'circa' ? 'c. ' : ''}${birth.year}` : null;
  if (!b) return death && death.year !== undefined ? `d. ${death.year}` : '';
  // Open-ended dash for the living (or unknown death): "1958 —" reads as still going.
  const dd = death && death.year !== undefined ? ` — ${death.year}` : ' —';
  return `${b}${dd}`;
}

// ---------------------------------------------------------------------------
// Ethiopic ⇄ Gregorian conversion (Beyene–Kudlek algorithm)
// ---------------------------------------------------------------------------

/** JD from Ethiopic date (Amete Mihret epoch, integer JDN). */
export const ETHIOPIC_JDN_EPOCH = 1724220;

export function ethiopicToJdn(year: number, month: number, day: number): number {
  return ETHIOPIC_JDN_EPOCH + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day;
}

/** Ethiopic date from JD — inverse of ethiopicToJdn, cycle-safe. */
export function jdnToEthiopic(jdn: number): { year: number; month: number; day: number } {
  const t = jdn - ETHIOPIC_JDN_EPOCH;
  const r = ((t % 1461) + 1461) % 1461;
  const s = r < 365 ? 1 : r < 730 ? 2 : r < 1096 ? 3 : 0; // year position in the 4-year cycle
  const k = Math.floor((t - 365 * s + 365) / 1461);
  const year = 4 * k + s;
  const n = t - (1461 * k + 365 * s - 365); // 1-based day of year
  const month = Math.floor((n - 1) / 30) + 1;
  const day = ((n - 1) % 30) + 1;
  return { year, month, day };
}

export function gregorianToJdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

export function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const dd = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * dd) / 4);
  const mm = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * mm + 2) / 5) + 1,
    month: mm + 3 - 12 * Math.floor(mm / 10),
    year: 100 * b + dd - 4800 + Math.floor(mm / 10),
  };
}

export function ethiopicToGregorian(y: number, m: number, d: number) {
  return jdnToGregorian(ethiopicToJdn(y, m, d));
}

export function gregorianToEthiopic(y: number, m: number, d: number) {
  return jdnToEthiopic(gregorianToJdn(y, m, d));
}

/** Convert a FamilyDate to Gregorian components where precision allows an anchor day. */
export function toGregorianAnchor(d: FamilyDate): { year: number; month: number; day: number } | null {
  if (d.precision === 'unknown' || d.year === undefined) return null;
  const cal = d.calendar ?? 'gregorian';
  const year = d.year;
  const month = d.month ?? (cal === 'ethiopic' ? 1 : 1);
  const day = d.day ?? 1;
  if (cal === 'ethiopic') return ethiopicToGregorian(year, month, day);
  return { year, month, day };
}

/** Approximate year in the other calendar, for display of a converted year. */
export function convertYear(d: FamilyDate): number | null {
  const a = toGregorianAnchor(d);
  return a ? a.year : null;
}

// ---------------------------------------------------------------------------
// Living status (SECURITY.md §3.3 — most heavily tested rule in the product)
// ---------------------------------------------------------------------------

export type LivingStatus = 'living' | 'deceased' | 'unknown';

export function resolveLiving(
  birth: FamilyDate | null | undefined,
  death: FamilyDate | null | undefined,
  asserted: boolean | null | undefined,
  today: { year: number } = { year: new Date().getFullYear() },
): LivingStatus {
  if (asserted === true) return 'living';
  if (asserted === false) return 'deceased';
  if (death && death.precision !== 'unknown') return 'deceased';
  const birthYear = birth?.year;
  if (!birth || birthYear === undefined) return 'unknown';
  // Ethiopian-calendar years are ~7-8 years behind; normalise to a Gregorian-ish anchor first.
  const g = toGregorianAnchor(birth);
  const by = g ? g.year : birthYear;
  return today.year - by <= LIVING_WINDOW_YEARS ? 'living' : 'deceased';
}

// ---------------------------------------------------------------------------
// Display names (DATABASE.md §4 — derived, never stored)
// ---------------------------------------------------------------------------

export interface NameParts {
  givenName?: string;
  middleName?: string;
  familyName?: string;
  nickname?: string;
}

export function displayName(p: NameParts): string {
  const n = (p.nickname ?? '').trim();
  if (n) return n;
  const given = (p.givenName ?? '').trim();
  const family = (p.familyName ?? '').trim();
  const middle = (p.middleName ?? '').trim();
  if (given && family) return middle ? `${given} ${middle} ${family}` : `${given} ${family}`;
  if (given) return given;
  if (family) return family;
  return middle || 'Unnamed';
}

export function initials(p: NameParts): string {
  if (![p.givenName, p.familyName, p.nickname, p.middleName].some((v) => (v ?? '').trim())) return '?';
  const dn = displayName(p);
  const parts = dn.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]![0] ?? '') + (parts[parts.length - 1]![0] ?? '')).toUpperCase();
}

// ---------------------------------------------------------------------------
// Permissions (ARCHITECTURE.md §4.2 — one pure function, client hides, server enforces)
// ---------------------------------------------------------------------------

export type Role = 'owner' | 'admin' | 'contributor' | 'viewer';
export type Visibility = 'private' | 'family' | 'selected' | 'public';

const ROLE_RANK: Record<Role, number> = { viewer: 0, contributor: 1, admin: 2, owner: 3 };

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export type PersonAction = 'view' | 'edit' | 'delete' | 'view-history';

export interface PermissionInput {
  role: Role | null; // null = not a member
  visibility: Visibility;
  isAuthor: boolean;
  isDraft?: boolean; // stories: drafts are author-only regardless of visibility
}

/** can(action, actor, resource) → boolean. Mirrors the server-side predicate. */
export function can(action: PersonAction, input: PermissionInput): boolean {
  const { role, visibility, isAuthor, isDraft } = input;
  if (isDraft) return isAuthor;
  switch (action) {
    case 'view': {
      if (visibility === 'public') return true;
      if (!role) return false;
      if (visibility === 'family') return true;
      if (visibility === 'selected') return isAuthor || roleAtLeast(role, 'admin');
      if (visibility === 'private') return isAuthor || roleAtLeast(role, 'admin');
      return false;
    }
    case 'view-history':
      return role !== null && visibility !== 'private' ? true : isAuthor || roleAtLeast(role ?? 'viewer', 'admin');
    case 'edit': {
      if (!role) return false;
      if (!roleAtLeast(role, 'contributor')) return false;
      // Restricted visibilities need authorship or admin — a contributor who cannot
      // view a record certainly cannot edit it.
      if (visibility === 'private' || visibility === 'selected') return isAuthor || roleAtLeast(role, 'admin');
      return true;
    }
    case 'delete':
      return role !== null && roleAtLeast(role, 'admin');
  }
}

/** Roles allowed to see the Manage section (UI_UX.md §2). */
export function canManage(role: Role | null): boolean {
  return role !== null && roleAtLeast(role, 'admin');
}

// ---------------------------------------------------------------------------
// Graph primitives — cycle rejection (FR-33) and relationship maths
// ---------------------------------------------------------------------------

/** Edge as consumed by layout and cycle checks. For 'parent', from = parent, to = child. */
export interface GraphEdge {
  from: string;
  to: string;
  kind: 'parent' | 'spouse' | 'sibling';
}

/**
 * Would adding from→to (kind 'parent') create a cycle in the ancestor graph?
 * Pure; used by both the API service and the client for instant feedback.
 */
export function createsCycle(edges: GraphEdge[], from: string, to: string): boolean {
  if (from === to) return true;
  // Walk "to" upward (following parent edges where to is the parent) —
  // i.e. does `from` already appear among `to`'s ancestors?
  const parentsOf = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind !== 'parent') continue;
    const list = parentsOf.get(e.to) ?? [];
    list.push(e.from);
    parentsOf.set(e.to, list);
  }
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === to) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const p of parentsOf.get(cur) ?? []) stack.push(p);
  }
  return false;
}

const MAX_KINSHIP_HOPS = 6;

/** Human-readable kinship label between two people, computed from the graph. Never hardcoded answers. */
export function kinshipLabel(
  edges: GraphEdge[],
  fromId: string,
  toId: string,
): string {
  if (fromId === toId) return 'This is you';
  /* Depth cap keeps this bounded on a large graph; beyond six hops a label
     stops being useful to a reader anyway. */
  const path = findPath(edges, fromId, toId, MAX_KINSHIP_HOPS);
  if (!path) return 'No known relationship';
  return describePath(path);
}

function findPath(edges: GraphEdge[], from: string, to: string, maxHops: number): string[] | null {
  const adj = new Map<string, Array<{ node: string; label: string }>>();
  const push = (a: string, b: string, label: string) => {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push({ node: b, label });
  };
  for (const e of edges) {
    if (e.kind === 'parent') {
      push(e.to, e.from, 'parent');
      push(e.from, e.to, 'child');
    } else if (e.kind === 'spouse') {
      push(e.from, e.to, 'spouse');
      push(e.to, e.from, 'spouse');
    }
  }
  interface Step { id: string; path: string[] }
  const queue: Step[] = [{ id: from, path: [] }];
  const visited = new Set<string>([from]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.id === to) return cur.path;
    if (cur.path.length >= maxHops * 2) continue;
    for (const nx of adj.get(cur.id) ?? []) {
      if (visited.has(nx.node)) continue;
      visited.add(nx.node);
      queue.push({ id: nx.node, path: [...cur.path, nx.label] });
    }
  }
  return null;
}

function describePath(path: string[]): string {
  if (path.length === 0) return 'This is you';
  if (path.length === 1) {
    const l = path[0]!;
    if (l === 'parent') return 'Parent';
    if (l === 'child') return 'Child';
    if (l === 'spouse') return 'Spouse';
  }
  if (path.length === 2) {
    const [a, b] = path as [string, string];
    if (a === 'parent' && b === 'parent') return 'Grandparent';
    if (a === 'parent' && b === 'child') return 'Sibling';
    if (a === 'child' && b === 'parent') return 'Child'; // co-parents' child
    if (a === 'child' && b === 'child') return 'Grandchild';
    if (a === 'parent' && b === 'spouse') return 'Mother/father-in-law';
    if (a === 'spouse' && b === 'parent') return 'Step-parent';
    if (a === 'spouse' && b === 'child') return 'Stepchild';
    if (a === 'child' && b === 'spouse') return 'Son/daughter-in-law';
  }
  if (path.length === 3) {
    const [a, b, c] = path as [string, string, string];
    if (a === 'parent' && b === 'parent' && c === 'child') return 'Aunt or uncle';
    if (a === 'parent' && b === 'child' && c === 'child') return 'Nephew or niece';
    if (a === 'parent' && b === 'parent' && c === 'parent') return 'Great-grandparent';
    if (a === 'child' && b === 'child' && c === 'child') return 'Great-grandchild';
    if (a === 'parent' && b === 'spouse' && c === 'child') return 'Brother/sister-in-law';
    if (a === 'spouse' && b === 'parent' && c === 'parent') return 'Grandparent (by marriage)';
  }
  const ups = path.filter((x) => x === 'parent').length;
  const downs = path.filter((x) => x === 'child').length;
  if (ups > 0 && downs > 0) {
    // Cousin degree is shared-generation depth, not edge count: first cousins
    // share grandparents (2 up + 2 down), so degree = min(ups, downs) − 1.
    const degree = Math.min(ups, downs) - 1;
    if (degree < 1) return 'Relative';
    if (ups === downs) return `${ordinal(degree)} cousin`;
    return `${ordinal(degree)} cousin ${Math.abs(ups - downs)}× removed`;
  }
  if (ups > 0) return `${'Great-'.repeat(ups - 1)}Grandparent`;
  return `${'Great-'.repeat(downs - 1)}Grandchild`;
}

function ordinal(n: number): string {
  if (n === 1) return 'First';
  if (n === 2) return 'Second';
  if (n === 3) return 'Third';
  return `${n}th`;
}
