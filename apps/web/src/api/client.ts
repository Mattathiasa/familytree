/* Mock API client. Mirrors API.md contracts so a real transport replaces this
   file (and only this file) when the backend exists. */

import {
  can, createsCycle, displayName, resolveLiving, roleAtLeast,
  type FamilyDate, type GraphEdge, type Role,
} from '@ft/domain';
import { emptyDb, seedDb, uid, type MockDb } from './mock-db';
import type {
  ActivityItemDto, ChangeRecordDto, FamilyLineage, FamilyStatsDto, InvitationDto, MemberDto,
  InvitationPreviewDto, MemoryDto, PersonDto, RelationshipDto, RelativeGroups, SessionUser, StoryDto,
  TreeResponseDto, UpcomingItemDto,
} from './types';

const KEY = 'ft.mock.db.v1';

function load(): MockDb {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as MockDb;
  } catch { /* corrupted store → reseed */ }
  return seedDb();
}

function save(db: MockDb): void {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* private mode */ }
}

let db: MockDb = load();
const listeners = new Set<() => void>();

function mutate(fn: (d: MockDb) => void): void {
  fn(db);
  save(db);
  for (const l of listeners) l();
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function resetDemoData(): void {
  db = seedDb();
  save(db);
  for (const l of listeners) l();
}

const delay = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));

export class ApiRequestError extends Error {
  constructor(public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

function requireUser(): SessionUser {
  if (!db.user) throw new ApiRequestError('UNAUTHENTICATED', 'Please sign in to continue.');
  return db.user;
}

/* Every family-scoped read has to prove membership first. Cross-tenant
   isolation is the first release-gating security test (SECURITY.md §11.1):
   a member of family A must not be able to read — or infer the existence of —
   anything in family B, by any endpoint, including by direct id. Until family
   switching worked this was invisible; now that the URL selects the family, an
   unscoped list is a live leak. */
function requireMembership(familyId: string): SessionUser {
  const user = requireUser();
  if (!db.families.some((f) => f.id === familyId)) {
    throw new ApiRequestError('FORBIDDEN', 'You don\'t have access to this family.');
  }
  return user;
}

/* ---------------- Auth (API.md §2) ---------------- */

export const auth = {
  async session(): Promise<{ user: SessionUser | null; families: MockDb['families']; activeFamilyId: string | null }> {
    await delay(80);
    if (!db.user) return { user: null, families: [], activeFamilyId: null };
    return { user: db.user, families: db.families, activeFamilyId: db.activeFamilyId };
  },

  async register(input: { email: string; password: string; displayName: string }): Promise<SessionUser> {
    await delay(300);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) {
      throw new ApiRequestError('VALIDATION_FAILED', 'Some of the details you entered need attention.', { email: 'Enter a valid email address.' });
    }
    if (input.password.length < 8) {
      throw new ApiRequestError('VALIDATION_FAILED', 'Some of the details you entered need attention.', { password: 'Use at least 8 characters.' });
    }
    const user: SessionUser = { id: uid(), email: input.email, displayName: input.displayName, emailVerified: false, locale: 'en' };
    mutate((d) => { d.user = user; });
    return user;
  },

  async login(input: { email: string; password: string }): Promise<SessionUser> {
    await delay(300);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) {
      throw new ApiRequestError('VALIDATION_FAILED', 'Some of the details you entered need attention.', { email: 'Enter a valid email address.' });
    }
    const user: SessionUser = { id: 'u-1', email: input.email, displayName: 'Sara Tesfaye', emailVerified: true, locale: 'en' };
    // Mock: any credentials sign into the demo family (clearly labelled in the UI).
    mutate((d) => {
      if (!d.families.length) Object.assign(d, seedDb(), { user });
      else d.user = user;
    });
    return user;
  },

  async verifyEmail(): Promise<SessionUser> {
    await delay(200);
    if (!db.user) throw new ApiRequestError('UNAUTHENTICATED', 'Please sign in to continue.');
    mutate((d) => { if (d.user) d.user.emailVerified = true; });
    return db.user;
  },

  async logout(): Promise<void> {
    await delay(100);
    mutate((d) => { d.user = null; });
  },

  async sendPasswordReset(email: string): Promise<void> {
    await delay(300);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new ApiRequestError('VALIDATION_FAILED', 'Enter a valid email address.');
    }
    void db;
    void requireUser;
  },

  async updateProfile(patch: { displayName?: string; locale?: SessionUser['locale'] }): Promise<SessionUser> {
    await delay(200);
    const user = requireUser();
    mutate((d) => {
      if (d.user) {
        if (patch.displayName !== undefined) d.user.displayName = patch.displayName;
        if (patch.locale !== undefined) d.user.locale = patch.locale;
      }
    });
    return db.user!;
  },
};

/* ---------------- People (API.md §4) ---------------- */

export interface PersonPatch {
  givenName?: string;
  middleName?: string;
  familyName?: string;
  nickname?: string;
  gender?: PersonDto['gender'];
  birthDate?: FamilyDate | null;
  deathDate?: FamilyDate | null;
  biography?: string;
  occupation?: string;
  birthPlace?: string;
  deathPlace?: string;
  visibility?: PersonDto['visibility'];
}

/* "Every field optional except a name" (FR-20) is the product's core rule, so
   it has to be checked against the name parts themselves. The previous check
   asked whether displayName() returned something — and it always does, because
   its last resort is the literal string 'Unnamed'. A person with every name
   field blank was accepted and then displayed as "Unnamed" forever. */
function requireAName(input: Pick<PersonPatch, 'givenName' | 'middleName' | 'familyName' | 'nickname'>): void {
  const anyName = [input.givenName, input.middleName, input.familyName, input.nickname]
    .some((part) => (part ?? '').trim().length > 0);
  if (!anyName) {
    throw new ApiRequestError(
      'VALIDATION_FAILED',
      'Some of the details you entered need attention.',
      { givenName: 'A name is required — everything else is optional.' },
    );
  }
}

export const people = {
  async list(familyId: string): Promise<PersonDto[]> {
    await delay();
    requireMembership(familyId);
    return db.people.filter((p) => p.familyId === familyId);
  },

  async get(familyId: string, personId: string): Promise<PersonDto> {
    await delay();
    requireMembership(familyId);
    const p = db.people.find((x) => x.familyId === familyId && x.id === personId);
    if (!p) throw new ApiRequestError('NOT_FOUND', 'We couldn\'t find this person.');
    return p;
  },

  async create(familyId: string, input: PersonPatch & { id?: string; claimedByMe?: boolean }): Promise<PersonDto> {
    await delay(200);
    const user = requireMembership(familyId);
    requireAName(input);
    if (input.claimedByMe) {
      /* One account claims at most one person per family, or "me" stops being
         a single answer and every kinship label becomes ambiguous. */
      const existing = db.people.find((p) => p.familyId === familyId && p.userId === user.id);
      if (existing) {
        throw new ApiRequestError('CONFLICT', `You've already claimed ${displayName(existing)} in this family.`);
      }
    }
    const now = new Date().toISOString();
    const person: PersonDto = {
      id: input.id ?? uid(),
      familyId,
      givenName: input.givenName ?? '',
      middleName: input.middleName ?? '',
      familyName: input.familyName ?? '',
      nickname: input.nickname ?? '',
      gender: input.gender ?? 'unknown',
      birthDate: input.birthDate ?? null,
      deathDate: input.deathDate ?? null,
      isLiving: null,
      biography: input.biography ?? '',
      occupation: input.occupation ?? '',
      birthPlace: input.birthPlace ?? '',
      deathPlace: input.deathPlace ?? '',
      photoUrl: null,
      visibility: input.visibility ?? 'family',
      // Onboarding adds you to your own family; that record is yours (spec §23).
      userId: input.claimedByMe ? user.id : null,
      version: 1,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    mutate((d) => {
      d.people.push(person);
      d.activity.unshift({
        id: uid(), familyId, actorName: user.displayName, verb: 'person.created',
        summary: `${user.displayName} added ${displayName(person)}`, at: now,
      });
    });
    return person;
  },

  async update(familyId: string, personId: string, version: number, patch: PersonPatch): Promise<PersonDto> {
    await delay(200);
    const user = requireMembership(familyId);
    const idx = db.people.findIndex((x) => x.familyId === familyId && x.id === personId);
    if (idx === -1) throw new ApiRequestError('NOT_FOUND', 'We couldn\'t find this person.');
    const current = db.people[idx]!;
    if (current.version !== version) {
      throw new ApiRequestError('CONFLICT', 'Someone else updated this person while you were editing.');
    }
    /* An edit must not be able to blank out the one required field either.
       Validate the name the person would end up with, not just what was sent. */
    requireAName({
      givenName: patch.givenName ?? current.givenName,
      middleName: patch.middleName ?? current.middleName,
      familyName: patch.familyName ?? current.familyName,
      nickname: patch.nickname ?? current.nickname,
    });

    const changes: ChangeRecordDto[] = [];
    const record = (field: string, label: string, oldV: string, newV: string) => {
      if (oldV !== newV) changes.push({ id: uid(), personId, field, label, oldValue: oldV, newValue: newV, actorName: user.displayName, at: new Date().toISOString() });
    };
    const fd = (f: FamilyDate | null | undefined) => (f ? `${f.precision === 'circa' ? 'c. ' : ''}${f.year ?? ''}` : '—');

    /* Only a field the patch actually carries can have changed. Reading
       `patch.x ?? current.x` hid that for text but not for the dates, where
       `patch.birthDate ?? null` turned an absent key into "cleared" — so
       editing only an occupation logged a birth date being erased that the
       write itself never touched. An audit trail that invents edits is worse
       than none (spec §48). */
    const sent = <K extends keyof PersonPatch>(key: K): boolean =>
      Object.prototype.hasOwnProperty.call(patch, key);

    if (sent('givenName')) record('givenName', 'Given name', current.givenName, patch.givenName ?? '');
    if (sent('familyName')) record('familyName', 'Family name', current.familyName ?? '', patch.familyName ?? '');
    if (sent('nickname')) record('nickname', 'Nickname', current.nickname ?? '', patch.nickname ?? '');
    if (sent('birthDate')) record('birthDate', 'Birth date', fd(current.birthDate), fd(patch.birthDate));
    if (sent('deathDate')) record('deathDate', 'Death date', fd(current.deathDate), fd(patch.deathDate));
    if (sent('occupation')) record('occupation', 'Occupation', current.occupation, patch.occupation ?? '');
    if (sent('biography')) record('biography', 'Biography', current.biography, patch.biography ?? '');
    if (sent('birthPlace')) record('birthPlace', 'Birth place', current.birthPlace, patch.birthPlace ?? '');
    if (sent('deathPlace')) record('deathPlace', 'Death place', current.deathPlace, patch.deathPlace ?? '');
    if (sent('visibility')) record('visibility', 'Visibility', current.visibility, patch.visibility ?? current.visibility);

    const updated: PersonDto = { ...current, ...patch, version: current.version + 1, updatedAt: new Date().toISOString() };
    mutate((d) => {
      d.people[idx] = updated;
      for (const c of changes) d.history.unshift(c);
      if (changes.length) {
        d.activity.unshift({
          id: uid(), familyId, actorName: user.displayName, verb: 'person.updated',
          summary: `${user.displayName} updated ${displayName(updated)}`, at: updated.updatedAt,
        });
      }
    });
    return updated;
  },

  async remove(familyId: string, personId: string): Promise<void> {
    await delay(200);
    requireMembership(familyId);
    mutate((d) => {
      d.people = d.people.filter((p) => !(p.familyId === familyId && p.id === personId));
      d.relationships = d.relationships.filter((r) => r.fromPersonId !== personId && r.toPersonId !== personId);
    });
  },

  async history(familyId: string, personId: string): Promise<ChangeRecordDto[]> {
    await delay();
    requireMembership(familyId);
    // Refuse a person from another family rather than leaking their history.
    const person = db.people.find((p) => p.familyId === familyId && p.id === personId);
    if (!person) throw new ApiRequestError('NOT_FOUND', 'We couldn\'t find this person.');
    return db.history.filter((h) => h.personId === personId).slice(0, 20);
  },
};

/* ---------------- Relationships (API.md §5) ---------------- */

export const relationships = {
  async list(familyId: string): Promise<RelationshipDto[]> {
    await delay();
    requireMembership(familyId);
    return db.relationships.filter((r) => db.people.some((p) => p.id === r.fromPersonId && p.familyId === familyId));
  },

  async create(familyId: string, input: { fromPersonId: string; toPersonId: string; kind: 'parent' | 'spouse' }): Promise<RelationshipDto> {
    await delay(150);
    requireMembership(familyId);
    const inFamily = (id: string) => db.people.some((p) => p.id === id && p.familyId === familyId);
    if (!inFamily(input.fromPersonId) || !inFamily(input.toPersonId)) {
      throw new ApiRequestError('NOT_FOUND', 'We couldn\'t find one of these people.');
    }
    if (input.fromPersonId === input.toPersonId) {
      throw new ApiRequestError('VALIDATION_FAILED', 'A person can\'t be related to themselves.');
    }
    const edges: GraphEdge[] = db.relationships.map((r) => ({ from: r.fromPersonId, to: r.toPersonId, kind: r.kind }));
    if (input.kind === 'parent' && createsCycle(edges, input.fromPersonId, input.toPersonId)) {
      throw new ApiRequestError('VALIDATION_FAILED', 'This connection would create a loop in the family tree.');
    }
    const dup = db.relationships.find(
      (r) => r.kind === input.kind &&
        ((r.fromPersonId === input.fromPersonId && r.toPersonId === input.toPersonId) ||
          (r.kind === 'spouse' && r.fromPersonId === input.toPersonId && r.toPersonId === input.fromPersonId)),
    );
    if (dup) throw new ApiRequestError('CONFLICT', 'This relationship already exists.');
    const rel: RelationshipDto = {
      id: uid(), fromPersonId: input.fromPersonId, toPersonId: input.toPersonId,
      kind: input.kind, nature: input.kind === 'spouse' ? 'unknown' : 'biological',
    };
    mutate((d) => { d.relationships.push(rel); });
    return rel;
  },

  async remove(familyId: string, relationshipId: string): Promise<void> {
    await delay(150);
    requireMembership(familyId);
    const famPeople = new Set(db.people.filter((p) => p.familyId === familyId).map((p) => p.id));
    const rel = db.relationships.find((r) => r.id === relationshipId);
    if (!rel || !famPeople.has(rel.fromPersonId)) {
      throw new ApiRequestError('NOT_FOUND', 'We couldn\'t find this relationship.');
    }
    mutate((d) => { d.relationships = d.relationships.filter((r) => r.id !== relationshipId); });
  },
};

/* ---------------- Relatives & tree (API.md §5–6) ---------------- */

export const family = {
  async relatives(familyId: string, personId: string): Promise<RelativeGroups> {
    await delay();
    requireMembership(familyId);
    const byId = (id: string) => db.people.find((p) => p.id === id);
    const parents: RelativeGroups['parents'] = [];
    const children: RelativeGroups['children'] = [];
    const spouses: RelativeGroups['spouses'] = [];
    const siblingIds = new Set<string>();
    for (const r of db.relationships) {
      if (r.kind === 'parent' && r.toPersonId === personId) {
        const p = byId(r.fromPersonId);
        if (p) parents.push({ person: p, nature: r.nature });
      }
      if (r.kind === 'parent' && r.fromPersonId === personId) {
        const c = byId(r.toPersonId);
        if (c) children.push({ person: c, nature: r.nature });
      }
      if (r.kind === 'spouse') {
        if (r.fromPersonId === personId) {
          const s = byId(r.toPersonId);
          if (s) spouses.push({ person: s, marriedDate: r.marriedDate ?? null });
        } else if (r.toPersonId === personId) {
          const s = byId(r.fromPersonId);
          if (s) spouses.push({ person: s, marriedDate: r.marriedDate ?? null });
        }
      }
    }
    // Siblings are derived from shared parents (DATABASE.md §4) — never stored.
    for (const r of db.relationships.filter((x) => x.kind === 'parent' && x.toPersonId === personId)) {
      for (const other of db.relationships.filter((y) => y.kind === 'parent' && y.fromPersonId === r.fromPersonId)) {
        if (other.toPersonId !== personId) {
          const s = byId(other.toPersonId);
          if (s) siblingIds.add(s.id);
        }
      }
    }
    const siblings = [...siblingIds].map((id) => byId(id)).filter((p): p is PersonDto => !!p)
      .map((person) => ({ person }));
    return { parents, spouses, children, siblings };
  },

  async tree(familyId: string, opts?: { root?: string; direction?: 'descendant' | 'ancestor' }): Promise<TreeResponseDto> {
    await delay();
    requireMembership(familyId);
    const famPeople = db.people.filter((p) => p.familyId === familyId);
    const root = opts?.root ?? db.relationships
      .filter((r) => r.kind === 'parent' && !db.relationships.some((x) => x.kind === 'parent' && x.toPersonId === r.fromPersonId))
      .map((r) => r.fromPersonId)[0] ?? famPeople[0]?.id;
    if (!root) throw new ApiRequestError('NOT_FOUND', 'This family has no people yet.');
    return { root, direction: opts?.direction ?? 'descendant', nodes: famPeople, edges: db.relationships, hasMore: false };
  },

  async stats(familyId: string): Promise<FamilyStatsDto> {
    await delay();
    requireMembership(familyId);
    const famPeople = db.people.filter((p) => p.familyId === familyId);
    const years = famPeople.map((p) => p.birthDate?.year).filter((y): y is number => typeof y === 'number');
    // generations = longest parent chain
    const depth = new Map<string, number>();
    const parentOf = new Map<string, string[]>();
    for (const r of db.relationships) {
      if (r.kind !== 'parent') continue;
      (parentOf.get(r.toPersonId) ?? parentOf.set(r.toPersonId, []).get(r.toPersonId)!).push(r.fromPersonId);
    }
    const calc = (id: string): number => {
      if (depth.has(id)) return depth.get(id)!;
      const ps = parentOf.get(id) ?? [];
      const d = ps.length === 0 ? 1 : Math.max(...ps.map(calc)) + 1;
      depth.set(id, d);
      return d;
    };
    famPeople.forEach((p) => calc(p.id));
    return {
      people: famPeople.length,
      generations: Math.max(0, ...depth.values()),
      stories: db.stories.filter((s) => s.status === 'published').length,
      photos: db.memories?.filter((m) => m.type === 'photo').length ?? 0,
      oldestBirthYear: years.length ? Math.min(...years) : null,
      newestBirthYear: years.length ? Math.max(...years) : null,
    };
  },

  async memories(familyId: string): Promise<MemoryDto[]> {
    await delay();
    requireMembership(familyId);
    return (db.memories ?? []).filter((m) => m.familyId === familyId);
  },

  async saveMemory(familyId: string, input: {
    id?: string;
    title: string;
    description: string;
    type: 'photo' | 'audio' | 'document';
    url: string;
    audioDuration?: string;
    dateLabel?: string;
    personIds?: string[];
    location?: string;
  }): Promise<MemoryDto> {
    await delay(200);
    const user = requireMembership(familyId);
    if (!input.title.trim()) {
      throw new ApiRequestError('VALIDATION_FAILED', 'Title is required.', { title: 'Give this memory a title.' });
    }
    const now = new Date().toISOString();
    if (input.id) {
      const idx = (db.memories ?? []).findIndex((m) => m.id === input.id && m.familyId === familyId);
      if (idx === -1) throw new ApiRequestError('NOT_FOUND', 'Memory not found.');
      const updated: MemoryDto = {
        ...db.memories[idx]!,
        title: input.title,
        description: input.description,
        type: input.type,
        url: input.url,
        audioDuration: input.audioDuration,
        dateLabel: input.dateLabel,
        personIds: input.personIds ?? [],
        location: input.location,
      };
      mutate((d) => { d.memories[idx] = updated; });
      return updated;
    }
    const memory: MemoryDto = {
      id: uid(),
      familyId,
      title: input.title,
      description: input.description,
      type: input.type,
      url: input.url,
      audioDuration: input.audioDuration,
      dateLabel: input.dateLabel,
      personIds: input.personIds ?? [],
      location: input.location,
      createdAt: now,
    };
    mutate((d) => {
      d.memories = d.memories ?? [];
      d.memories.unshift(memory);
      d.activity.unshift({
        id: uid(),
        familyId,
        actorName: user.displayName,
        verb: 'memory.created',
        summary: `${user.displayName} added memory “${memory.title}”`,
        at: now,
      });
    });
    return memory;
  },

  async deleteMemory(familyId: string, memoryId: string): Promise<void> {
    await delay(150);
    requireMembership(familyId);
    if (!(db.memories ?? []).some((m) => m.id === memoryId && m.familyId === familyId)) {
      throw new ApiRequestError('NOT_FOUND', 'Memory not found.');
    }
    mutate((d) => {
      d.memories = (d.memories ?? []).filter((m) => m.id !== memoryId);
    });
  },

  async activity(familyId: string): Promise<ActivityItemDto[]> {
    await delay();
    requireMembership(familyId);
    return db.activity.filter((a) => a.familyId === familyId).slice(0, 12);
  },

  async upcoming(familyId: string): Promise<UpcomingItemDto[]> {
    await delay();
    requireMembership(familyId);
    // Birthdays need exact dates to be meaningful; the seed uses years on purpose,
    // so the demo shows the "add exact dates" nudge instead of fabricated dates.
    return [];
  },

  async members(familyId: string): Promise<MemberDto[]> {
    await delay();
    requireMembership(familyId);
    return db.members.filter((m) => m.familyId === familyId);
  },

  async invitations(familyId: string): Promise<InvitationDto[]> {
    await delay();
    requireMembership(familyId);
    return db.invitations.filter((i) => i.familyId === familyId);
  },

  async invite(familyId: string, input: { email?: string; role: Role }): Promise<InvitationDto> {
    await delay(200);
    requireMembership(familyId);
    const token = uid().replace(/-/g, '').slice(0, 16);
    const inv: InvitationDto = {
      id: uid(), familyId, email: input.email ?? '', role: input.role, status: 'pending',
      token,
      inviteUrl: `/invite/${token}`,
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
    };
    mutate((d) => { d.invitations.unshift(inv); });
    return inv;
  },

  async revokeInvitation(familyId: string, invitationId: string): Promise<void> {
    await delay(150);
    requireMembership(familyId);
    if (!db.invitations.some((i) => i.id === invitationId && i.familyId === familyId)) {
      throw new ApiRequestError('NOT_FOUND', 'We couldn\'t find this invitation.');
    }
    mutate((d) => {
      const inv = d.invitations.find((i) => i.id === invitationId);
      if (inv) inv.status = 'revoked';
    });
  },

  /* Unauthenticated: the token is the credential, and you are shown what you
     are being offered before being asked to sign in (API.md §3). */
  async invitationPreview(token: string): Promise<InvitationPreviewDto> {
    await delay(150);
    const inv = db.invitations.find((i) => i.token === token);
    if (!inv) throw new ApiRequestError('NOT_FOUND', 'This invitation link is not valid.');
    return {
      familyName: db.families.find((f) => f.id === inv.familyId)?.name ?? 'a family',
      role: inv.role,
      status: inv.status,
      expired: Date.parse(inv.expiresAt) < Date.now(),
    };
  },

  async acceptInvitation(token: string): Promise<void> {
    await delay(200);
    const user = requireUser();
    const found = db.invitations.find((i) => i.token === token);
    if (!found) throw new ApiRequestError('NOT_FOUND', 'This invitation link is not valid.');
    if (found.status === 'revoked' || found.status === 'rejected') {
      throw new ApiRequestError('FORBIDDEN', 'This invitation is no longer open.');
    }
    if (Date.parse(found.expiresAt) < Date.now()) {
      throw new ApiRequestError('FORBIDDEN', 'This invitation has expired. Ask for a new one.');
    }
    mutate((d) => {
      const inv = d.invitations.find((i) => i.token === token);
      if (inv && inv.status === 'pending') {
        inv.status = 'accepted';
        d.members.push({
          familyId: inv.familyId,
          userId: user.id,
          name: user.displayName,
          email: user.email,
          role: inv.role,
          joinedAt: new Date().toISOString(),
        });
        // Accepting is what makes the family visible to this account.
        if (!d.families.some((f) => f.id === inv.familyId)) {
          d.families.push({
            id: inv.familyId, name: 'Family', description: '',
            role: inv.role, coverGradient: d.families.length,
          });
        }
      }
    });
  },

  async changeRole(familyId: string, userId: string, role: Role): Promise<void> {
    await delay(150);
    requireMembership(familyId);
    mutate((d) => {
      // Scoped: this used to change the user's role in every family at once.
      const m = d.members.find((x) => x.userId === userId && x.familyId === familyId);
      if (m) m.role = role;
      // Keep the caller's own family list in step when they change their own role.
      const own = d.families.find((f) => f.id === familyId);
      if (own && d.user?.id === userId) own.role = role;
    });
  },

  async removeMember(familyId: string, userId: string): Promise<void> {
    await delay(150);
    requireMembership(familyId);
    // Scoped: this used to drop the user from every family they belonged to.
    mutate((d) => { d.members = d.members.filter((m) => !(m.userId === userId && m.familyId === familyId)); });
  },

  async stories(familyId: string): Promise<StoryDto[]> {
    await delay();
    requireMembership(familyId);
    return db.stories.filter((s) => s.familyId === familyId);
  },

  async saveStory(familyId: string, input: { id?: string; title: string; body: string; periodLabel?: string; personIds?: string[]; status?: 'draft' | 'published' }): Promise<StoryDto> {
    await delay(200);
    const user = requireMembership(familyId);
    if (!input.title.trim()) {
      throw new ApiRequestError('VALIDATION_FAILED', 'Some of the details you entered need attention.', { title: 'Give the story a title.' });
    }
    const now = new Date().toISOString();
    if (input.id) {
      const idx = db.stories.findIndex((s) => s.id === input.id && s.familyId === familyId);
      if (idx === -1) throw new ApiRequestError('NOT_FOUND', 'We couldn\'t find this story.');
      const existing = db.stories[idx]!;
      /* An unpublished draft belongs to its author alone (SECURITY.md §11.5),
         and nobody edits someone else's story in place — a correction goes
         through the suggestion flow instead (spec §48, §49). */
      if (existing.authorId !== user.id) {
        throw new ApiRequestError('FORBIDDEN', 'Only the author can edit this story.');
      }
      const updated: StoryDto = { ...existing, title: input.title, body: input.body, periodLabel: input.periodLabel ?? existing.periodLabel, personIds: input.personIds ?? existing.personIds, status: input.status ?? existing.status, updatedAt: now };
      mutate((d) => { d.stories[idx] = updated; });
      return updated;
    }
    const story: StoryDto = {
      id: uid(), familyId, title: input.title, body: input.body,
      authorId: user.id, authorName: user.displayName,
      periodLabel: input.periodLabel ?? '', status: input.status ?? 'draft',
      personIds: input.personIds ?? [], updatedAt: now,
    };
    mutate((d) => {
      d.stories.unshift(story);
      if (story.status === 'published') {
        d.activity.unshift({ id: uid(), familyId, actorName: user.displayName, verb: 'story.created', summary: `${user.displayName} published “${story.title}”`, at: now });
      }
    });
    return story;
  },
};

/* ---------------- Family create/update (mock-side; API.md §3) ---------------- */

export function familyDbCreate(name: string, description: string, id: string, lineage: FamilyLineage = 'ethiopian'): void {
  const user = db.user;
  if (!user) return;
  mutate((d) => {
    d.families.push({ id, name, description, role: 'owner', peopleCount: 0, coverGradient: d.families.length, lineage });
    // The creator is a member, not just an owner flag — otherwise a brand-new
    // family's Members page is empty and role changes have nothing to act on.
    d.members.push({
      familyId: id, userId: user.id, name: user.displayName, email: user.email,
      role: 'owner', joinedAt: new Date().toISOString(),
    });
    d.activeFamilyId = id;
  });
}

/* The family the user is currently working in. Survives a reload so returning to
   /families or /account does not silently snap back to the first family. */
export function familyDbSetActive(familyId: string): void {
  if (db.activeFamilyId === familyId) return;
  mutate((d) => {
    if (d.families.some((f) => f.id === familyId)) d.activeFamilyId = familyId;
  });
}

export function updateFamilyInDb(familyId: string, name: string, description: string): void {
  mutate((d) => {
    const fam = d.families.find((f) => f.id === familyId);
    if (fam) { fam.name = name; fam.description = description; }
  });
}

export function familyDbSetCalendar(familyId: string, lineage: FamilyLineage): void {
  mutate((d) => {
    const fam = d.families.find((f) => f.id === familyId);
    if (fam) { fam.lineage = lineage; }
  });
}

export function familyDbSetPhoto(familyId: string, photoUrl: string | null): void {
  mutate((d) => {
    const fam = d.families.find((f) => f.id === familyId);
    if (fam) { fam.photoUrl = photoUrl; }
  });
}

export function familyDbSetPrivacy(familyId: string, privacy: 'public' | 'family' | 'private'): void {
  mutate((d) => {
    const fam = d.families.find((f) => f.id === familyId);
    if (fam) { fam.privacy = privacy; }
  });
}

/* ---------------- Helpers used by screens ---------------- */

export function personLabel(p: PersonDto): string {
  return displayName(p);
}

export function livingStatusOf(p: PersonDto): 'living' | 'deceased' | 'unknown' {
  return resolveLiving(p.birthDate, p.deathDate, p.isLiving ?? null);
}

/** Living / deceased / unrecorded counts for a set of people. Derived, never
    stored — and shared so two screens cannot disagree about the same number. */
export function livingTally(list: PersonDto[]): { living: number; deceased: number; unknown: number } {
  const tally = { living: 0, deceased: 0, unknown: 0 };
  for (const p of list) tally[livingStatusOf(p)] += 1;
  return tally;
}

export function canEditPerson(role: Role | null, p: PersonDto, user: SessionUser | null): boolean {
  if (!role || !user) return false;
  return can('edit', { role, visibility: p.visibility, isAuthor: p.createdBy === user.id });
}

/** The person record this account has claimed, if any — i.e. "me" in the graph.
    Without it there is no basis for a relative-to-you kinship label. */
export function claimedPerson(list: PersonDto[], user: SessionUser | null): PersonDto | null {
  if (!user) return null;
  return list.find((p) => p.userId === user.id) ?? null;
}

/** Adding a person is a write on the family, not on any existing record. */
export function canAddPeople(role: Role | null): boolean {
  return roleAtLeastHelper(role, 'contributor');
}

export function canDeletePerson(role: Role | null, p: PersonDto, user: SessionUser | null): boolean {
  if (!role || !user) return false;
  return can('delete', { role, visibility: p.visibility, isAuthor: p.createdBy === user.id });
}

export function roleAtLeastHelper(role: Role | null, min: Role): boolean {
  return role ? roleAtLeast(role, min) : false;
}
