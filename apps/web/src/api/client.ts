/* Mock API client. Mirrors API.md contracts so a real transport replaces this
   file (and only this file) when the backend exists. */

import {
  can, createsCycle, displayName, resolveLiving, roleAtLeast,
  type FamilyDate, type GraphEdge, type Role,
} from '@ft/domain';
import { emptyDb, seedDb, uid, type MockDb, type FamilyInDb } from './mock-db';
import type {
  ActivityItemDto, ChangeRecordDto, FamilyLineage, FamilyStatsDto, InvitationDto, MemberDto,
  MemoryDto, PersonDto, RelationshipDto, RelativeGroups, SessionUser, StoryDto,
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

export const people = {
  async list(familyId: string): Promise<PersonDto[]> {
    await delay();
    requireUser();
    return db.people.filter((p) => p.familyId === familyId);
  },

  async get(familyId: string, personId: string): Promise<PersonDto> {
    await delay();
    requireUser();
    const p = db.people.find((x) => x.familyId === familyId && x.id === personId);
    if (!p) throw new ApiRequestError('NOT_FOUND', 'We couldn\'t find this person.');
    return p;
  },

  async create(familyId: string, input: PersonPatch & { id?: string }): Promise<PersonDto> {
    await delay(200);
    const user = requireUser();
    if (!displayName({ givenName: input.givenName ?? '', familyName: input.familyName ?? '', nickname: input.nickname ?? '' }).trim()) {
      throw new ApiRequestError('VALIDATION_FAILED', 'Some of the details you entered need attention.', { givenName: 'A name is required — everything else is optional.' });
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
      version: 1,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    mutate((d) => {
      d.people.push(person);
      d.activity.unshift({
        id: uid(), actorName: user.displayName, verb: 'person.created',
        summary: `${user.displayName} added ${displayName(person)}`, at: now,
      });
    });
    return person;
  },

  async update(familyId: string, personId: string, version: number, patch: PersonPatch): Promise<PersonDto> {
    await delay(200);
    const user = requireUser();
    const idx = db.people.findIndex((x) => x.familyId === familyId && x.id === personId);
    if (idx === -1) throw new ApiRequestError('NOT_FOUND', 'We couldn\'t find this person.');
    const current = db.people[idx]!;
    if (current.version !== version) {
      throw new ApiRequestError('CONFLICT', 'Someone else updated this person while you were editing.');
    }
    const changes: ChangeRecordDto[] = [];
    const record = (field: string, label: string, oldV: string, newV: string) => {
      if (oldV !== newV) changes.push({ id: uid(), field, label, oldValue: oldV, newValue: newV, actorName: user.displayName, at: new Date().toISOString() });
    };
    const fd = (f: FamilyDate | null | undefined) => (f ? `${f.precision === 'circa' ? 'c. ' : ''}${f.year ?? ''}` : '—');
    record('givenName', 'Given name', current.givenName, patch.givenName ?? current.givenName);
    record('familyName', 'Family name', current.familyName ?? '', patch.familyName ?? current.familyName ?? '');
    record('nickname', 'Nickname', current.nickname ?? '', patch.nickname ?? current.nickname ?? '');
    record('birthDate', 'Birth date', fd(current.birthDate), fd(patch.birthDate ?? null));
    record('deathDate', 'Death date', fd(current.deathDate), fd(patch.deathDate ?? null));
    record('occupation', 'Occupation', current.occupation, patch.occupation ?? current.occupation);
    record('biography', 'Biography', current.biography, patch.biography ?? current.biography);
    record('birthPlace', 'Birth place', current.birthPlace, patch.birthPlace ?? current.birthPlace);

    const updated: PersonDto = { ...current, ...patch, version: current.version + 1, updatedAt: new Date().toISOString() };
    mutate((d) => {
      d.people[idx] = updated;
      for (const c of changes) d.history.unshift(c);
      if (changes.length) {
        d.activity.unshift({
          id: uid(), actorName: user.displayName, verb: 'person.updated',
          summary: `${user.displayName} updated ${displayName(updated)}`, at: updated.updatedAt,
        });
      }
    });
    return updated;
  },

  async remove(familyId: string, personId: string): Promise<void> {
    await delay(200);
    requireUser();
    mutate((d) => {
      d.people = d.people.filter((p) => !(p.familyId === familyId && p.id === personId));
      d.relationships = d.relationships.filter((r) => r.fromPersonId !== personId && r.toPersonId !== personId);
    });
  },

  async history(familyId: string, personId: string): Promise<ChangeRecordDto[]> {
    await delay();
    requireUser();
    void familyId;
    return db.history.slice(0, 20);
  },
};

/* ---------------- Relationships (API.md §5) ---------------- */

export const relationships = {
  async list(familyId: string): Promise<RelationshipDto[]> {
    await delay();
    requireUser();
    return db.relationships.filter((r) => db.people.some((p) => p.id === r.fromPersonId && p.familyId === familyId));
  },

  async create(familyId: string, input: { fromPersonId: string; toPersonId: string; kind: 'parent' | 'spouse' }): Promise<RelationshipDto> {
    await delay(150);
    requireUser();
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

  async remove(_familyId: string, relationshipId: string): Promise<void> {
    await delay(150);
    requireUser();
    mutate((d) => { d.relationships = d.relationships.filter((r) => r.id !== relationshipId); });
  },
};

/* ---------------- Relatives & tree (API.md §5–6) ---------------- */

export const family = {
  async relatives(familyId: string, personId: string): Promise<RelativeGroups> {
    await delay();
    requireUser();
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
    void familyId;
    return { parents, spouses, children, siblings };
  },

  async tree(familyId: string, opts?: { root?: string; direction?: 'descendant' | 'ancestor' }): Promise<TreeResponseDto> {
    await delay();
    requireUser();
    const famPeople = db.people.filter((p) => p.familyId === familyId);
    const root = opts?.root ?? db.relationships
      .filter((r) => r.kind === 'parent' && !db.relationships.some((x) => x.kind === 'parent' && x.toPersonId === r.fromPersonId))
      .map((r) => r.fromPersonId)[0] ?? famPeople[0]?.id;
    if (!root) throw new ApiRequestError('NOT_FOUND', 'This family has no people yet.');
    return { root, direction: opts?.direction ?? 'descendant', nodes: famPeople, edges: db.relationships, hasMore: false };
  },

  async stats(familyId: string): Promise<FamilyStatsDto> {
    await delay();
    requireUser();
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
    requireUser();
    void familyId;
    return db.memories ?? [];
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
    const user = requireUser();
    if (!input.title.trim()) {
      throw new ApiRequestError('VALIDATION_FAILED', 'Title is required.', { title: 'Give this memory a title.' });
    }
    const now = new Date().toISOString();
    if (input.id) {
      const idx = (db.memories ?? []).findIndex((m) => m.id === input.id);
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
        actorName: user.displayName,
        verb: 'memory.created',
        summary: `${user.displayName} added memory “${memory.title}”`,
        at: now,
      });
    });
    return memory;
  },

  async deleteMemory(_familyId: string, memoryId: string): Promise<void> {
    await delay(150);
    requireUser();
    mutate((d) => {
      d.memories = (d.memories ?? []).filter((m) => m.id !== memoryId);
    });
  },

  async activity(familyId: string): Promise<ActivityItemDto[]> {
    await delay();
    requireUser();
    void familyId;
    return db.activity.slice(0, 12);
  },

  async upcoming(familyId: string): Promise<UpcomingItemDto[]> {
    await delay();
    requireUser();
    void familyId;
    // Birthdays need exact dates to be meaningful; the seed uses years on purpose,
    // so the demo shows the "add exact dates" nudge instead of fabricated dates.
    return [];
  },

  async members(familyId: string): Promise<MemberDto[]> {
    await delay();
    requireUser();
    void familyId;
    return db.members;
  },

  async invitations(familyId: string): Promise<InvitationDto[]> {
    await delay();
    requireUser();
    void familyId;
    return db.invitations;
  },

  async invite(familyId: string, input: { email?: string; role: Role }): Promise<InvitationDto> {
    await delay(200);
    requireUser();
    const inv: InvitationDto = {
      id: uid(), email: input.email ?? '', role: input.role, status: 'pending',
      inviteUrl: `https://familytree.app/invite/${uid().slice(0, 8)}…`,
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
    };
    mutate((d) => { d.invitations.unshift(inv); });
    return inv;
  },

  async revokeInvitation(_familyId: string, invitationId: string): Promise<void> {
    await delay(150);
    requireUser();
    mutate((d) => {
      const inv = d.invitations.find((i) => i.id === invitationId);
      if (inv) inv.status = 'revoked';
    });
  },

  async acceptInvitation(invitationId: string): Promise<void> {
    await delay(200);
    const user = requireUser();
    mutate((d) => {
      const inv = d.invitations.find((i) => i.id === invitationId);
      if (inv && inv.status === 'pending') {
        inv.status = 'accepted';
        d.members.push({
          userId: user.id,
          name: user.displayName,
          email: user.email,
          role: inv.role,
          joinedAt: new Date().toISOString(),
        });
      }
    });
  },

  async changeRole(_familyId: string, userId: string, role: Role): Promise<void> {
    await delay(150);
    requireUser();
    mutate((d) => {
      const m = d.members.find((x) => x.userId === userId);
      if (m) m.role = role;
    });
  },

  async removeMember(_familyId: string, userId: string): Promise<void> {
    await delay(150);
    requireUser();
    mutate((d) => { d.members = d.members.filter((m) => m.userId !== userId); });
  },

  async stories(familyId: string): Promise<StoryDto[]> {
    await delay();
    requireUser();
    void familyId;
    return db.stories;
  },

  async saveStory(familyId: string, input: { id?: string; title: string; body: string; periodLabel?: string; personIds?: string[]; status?: 'draft' | 'published' }): Promise<StoryDto> {
    await delay(200);
    const user = requireUser();
    if (!input.title.trim()) {
      throw new ApiRequestError('VALIDATION_FAILED', 'Some of the details you entered need attention.', { title: 'Give the story a title.' });
    }
    const now = new Date().toISOString();
    if (input.id) {
      const idx = db.stories.findIndex((s) => s.id === input.id);
      if (idx === -1) throw new ApiRequestError('NOT_FOUND', 'We couldn\'t find this story.');
      const updated: StoryDto = { ...db.stories[idx]!, title: input.title, body: input.body, periodLabel: input.periodLabel ?? db.stories[idx]!.periodLabel, personIds: input.personIds ?? db.stories[idx]!.personIds, status: input.status ?? db.stories[idx]!.status, updatedAt: now };
      mutate((d) => { d.stories[idx] = updated; });
      return updated;
    }
    const story: StoryDto = {
      id: uid(), title: input.title, body: input.body, authorName: user.displayName,
      periodLabel: input.periodLabel ?? '', status: input.status ?? 'draft',
      personIds: input.personIds ?? [], updatedAt: now,
    };
    mutate((d) => {
      d.stories.unshift(story);
      if (story.status === 'published') {
        d.activity.unshift({ id: uid(), actorName: user.displayName, verb: 'story.created', summary: `${user.displayName} published “${story.title}”`, at: now });
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
    if (fam) { (fam as FamilyInDb & { photoUrl?: string | null }).photoUrl = photoUrl; }
  });
}

export function familyDbSetPrivacy(familyId: string, privacy: 'public' | 'family' | 'private'): void {
  mutate((d) => {
    const fam = d.families.find((f) => f.id === familyId);
    if (fam) { (fam as FamilyInDb & { privacy?: string }).privacy = privacy; }
  });
}

/* ---------------- Helpers used by screens ---------------- */

export function personLabel(p: PersonDto): string {
  return displayName(p);
}

export function livingStatusOf(p: PersonDto): 'living' | 'deceased' | 'unknown' {
  return resolveLiving(p.birthDate, p.deathDate, p.isLiving ?? null);
}

export function canEditPerson(role: Role | null, p: PersonDto, user: SessionUser | null): boolean {
  if (!role || !user) return false;
  return can('edit', { role, visibility: p.visibility, isAuthor: p.createdBy === user.id });
}

export function roleAtLeastHelper(role: Role | null, min: Role): boolean {
  return role ? roleAtLeast(role, min) : false;
}
