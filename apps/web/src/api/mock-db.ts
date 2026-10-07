/* Seeded demo data. Persisted to localStorage so edits survive reloads
   (mirrors the offline-drafts principle in ARCHITECTURE.md §13, MVP-scoped). */

import type {
  ActivityItemDto, ChangeRecordDto, FamilyLineage, InvitationDto, MemberDto, MemoryDto, PersonDto,
  RelationshipDto, SessionUser, StoryDto,
} from './types';
import type { FamilyDate } from '@ft/domain';

export interface FamilyInDb {
  id: string;
  name: string;
  description: string;
  role: 'owner' | 'admin' | 'contributor' | 'viewer';
  peopleCount?: number;
  coverGradient?: number;
  lineage?: FamilyLineage;
  photoUrl?: string | null;
  privacy?: 'public' | 'family' | 'private';
}

export interface MockDb {
  user: SessionUser | null;
  families: FamilyInDb[];
  activeFamilyId: string | null;
  people: PersonDto[];
  relationships: RelationshipDto[];
  stories: StoryDto[];
  memories: MemoryDto[];
  history: ChangeRecordDto[];
  activity: ActivityItemDto[];
  members: MemberDto[];
  invitations: InvitationDto[];
}

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

export function emptyDb(): MockDb {
  return {
    user: null, families: [], activeFamilyId: null,
    people: [], relationships: [], stories: [], memories: [], history: [], activity: [], members: [], invitations: [],
  };
}

/* ---------------- Seed: the demo family (spec §21 vibe) ---------------- */

export function seedDb(): MockDb {
  const U = 'u-1';
  const user: SessionUser = {
    id: U, email: 'sara@example.com', displayName: 'Sara Tesfaye',
    emailVerified: true, locale: 'en',
  };

  const fam = { id: 'fam-1', name: 'The Abebe Family', description: 'Our family history — from Gondar to everywhere.', role: 'owner' as const, coverGradient: 3 };

  const y = (n: number) => ({ calendar: 'gregorian' as const, precision: 'year' as const, year: n });
  const cy = (n: number) => ({ calendar: 'gregorian' as const, precision: 'circa' as const, year: n });

  const P = (
    id: string, givenName: string, familyName: string,
    birth: FamilyDate | null, death: FamilyDate | null,
    extra: Partial<PersonDto> = {},
  ): PersonDto => ({
    id, familyId: fam.id, givenName, middleName: '', familyName, nickname: '',
    gender: 'unknown', birthDate: birth as PersonDto['birthDate'], deathDate: death as PersonDto['deathDate'],
    isLiving: null, biography: '', occupation: '', birthPlace: '', deathPlace: '',
    photoUrl: null, visibility: 'family', version: 1, createdBy: U,
    createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z', ...extra,
  });

  const people: PersonDto[] = [
    P('p-abebe', 'Abebe', 'Abebe', y(1948), { calendar: 'gregorian', precision: 'year', year: 2019 }, {
      nickname: 'Ababayeh', gender: 'male', occupation: 'Teacher',
      birthPlace: 'Gondar, Ethiopia', biography:
        'Born in Gondar, Abebe taught mathematics for 34 years. He walked two hours to school as a boy and never missed a day. Every grandchild got the same advice: "Learn everything you can — nobody can take it from you."',
    }),
    P('p-hana', 'Hana', 'Abebe', cy(1950), null, {
      gender: 'female', occupation: 'Weaver', birthPlace: 'Gondar, Ethiopia',
      biography: 'Hana wove the gabis every grandchild was wrapped in, and still grows the family\'s coffee in the yard.',
    }),
    P('p-sara', 'Sara', 'Tesfaye', y(1972), null, {
      gender: 'female', occupation: 'Nurse', birthPlace: 'Addis Ababa, Ethiopia',
      biography: 'The youngest of five, Sara moved to Addis for nursing school and stayed.',
    }),
    P('p-daniel', 'Daniel', 'Tesfaye', y(1970), null, {
      gender: 'male', occupation: 'Engineer', birthPlace: 'Addis Ababa, Ethiopia',
    }),
    P('p-mikael', 'Mikael', 'Tesfaye', y(1998), null, {
      gender: 'male', occupation: 'Photographer', birthPlace: 'Addis Ababa, Ethiopia',
      biography: 'Mikael photographs every family gathering — the reason this archive has pictures at all.',
    }),
    P('p-liya', 'Liya', 'Tesfaye', y(2001), null, { gender: 'female', birthPlace: 'Addis Ababa, Ethiopia' }),
    P('p-nahom', 'Nahom', 'Tesfaye', y(2004), null, { gender: 'male', birthPlace: 'Addis Ababa, Ethiopia' }),
    P('p-alem', 'Alem', 'Abebe', y(1946), y(2010), {
      gender: 'male', occupation: 'Farmer', birthPlace: 'Gondar, Ethiopia',
      biography: 'Abebe\'s older brother. Worked the family land outside Gondar his whole life.',
    }),
    P('p-tsehay', 'Tsehay', 'Abebe', y(1975), null, { gender: 'female', birthPlace: 'Gondar, Ethiopia' }),
    P('p-bethlehem', 'Bethlehem', 'Girma', y(1976), null, { gender: 'female', birthPlace: 'Bahir Dar, Ethiopia' }),
  ];

  const R = (id: string, fromPersonId: string, toPersonId: string, kind: RelationshipDto['kind'], extra: Partial<RelationshipDto> = {}): RelationshipDto => ({
    id, fromPersonId, toPersonId, kind, nature: kind === 'spouse' ? 'unknown' : 'biological', ...extra,
  });

  const relationships: RelationshipDto[] = [
    R('r1', 'p-abebe', 'p-hana', 'spouse', { marriedDate: y(1970), nature: 'unknown' }),
    R('r2', 'p-daniel', 'p-sara', 'spouse', { marriedDate: y(1996), nature: 'unknown' }),
    R('r3', 'p-abebe', 'p-sara', 'parent'),
    R('r4', 'p-hana', 'p-sara', 'parent'),
    R('r5', 'p-abebe', 'p-tsehay', 'parent'),
    R('r6', 'p-hana', 'p-tsehay', 'parent'),
    R('r7', 'p-daniel', 'p-mikael', 'parent'),
    R('r8', 'p-sara', 'p-mikael', 'parent'),
    R('r9', 'p-daniel', 'p-liya', 'parent'),
    R('r10', 'p-sara', 'p-liya', 'parent'),
    R('r11', 'p-daniel', 'p-nahom', 'parent'),
    R('r12', 'p-sara', 'p-nahom', 'parent'),
    R('r13', 'p-tsehay', 'p-bethlehem', 'spouse', { marriedDate: y(2003), nature: 'unknown' }),
  ];

  const stories: StoryDto[] = [
    {
      id: 'st-1', title: 'Grandfather\'s Journey', authorName: 'Sara Tesfaye',
      body: 'Abebe left Gondar in 1966 with two shirts and a suitcase of books. He walked to Gondar station, took the bus to Addis, and arrived with less than a dollar. "The city is big," he wrote to his mother, "but my hands are trained." He was admitted to teachers\' college that spring.',
      periodLabel: '1966', status: 'published', personIds: ['p-abebe'], updatedAt: '2026-09-10T09:00:00Z',
    },
    {
      id: 'st-2', title: 'How Grandma Met Grandpa', authorName: 'Sara Tesfaye',
      body: 'Hana sold woven baskets beside the school where Abebe taught. He bought one every month until she laughed and asked if his house had walls left.',
      periodLabel: 'c. 1968', status: 'published', personIds: ['p-abebe', 'p-hana'], updatedAt: '2026-09-12T09:00:00Z',
    },
    {
      id: 'st-3', title: 'The Coffee Ceremony Rules (as Ababa insists)', authorName: 'Mikael Tesfaye',
      body: 'Draft: 1. The youngest pours. 2. No business before the third cup. 3. Guests sit closest to the rekebot. …',
      periodLabel: 'Traditions', status: 'draft', personIds: ['p-hana'], updatedAt: '2026-09-20T09:00:00Z',
    },
  ];

  const history: ChangeRecordDto[] = [
    { id: 'h1', field: 'birthDate', label: 'Birth year', oldValue: '1947', newValue: '1948', actorName: 'Tsehay Abebe', at: '2026-09-18T14:30:00Z' },
    { id: 'h2', field: 'occupation', label: 'Occupation', oldValue: '—', newValue: 'Teacher', actorName: 'Sara Tesfaye', at: '2026-09-05T08:12:00Z' },
  ];

  const activity: ActivityItemDto[] = [
    { id: 'a1', actorName: 'Tsehay Abebe', verb: 'person.updated', summary: 'Tsehay corrected Abebe\'s birth year', at: '2026-09-18T14:30:00Z' },
    { id: 'a2', actorName: 'Mikael Tesfaye', verb: 'story.created', summary: 'Mikael started a story about the coffee ceremony', at: '2026-09-20T09:00:00Z' },
    { id: 'a3', actorName: 'Sara Tesfaye', verb: 'story.created', summary: 'Sara published "Grandfather\'s Journey"', at: '2026-09-10T09:00:00Z' },
  ];

  const members: MemberDto[] = [
    { userId: 'u-1', name: 'Sara Tesfaye', email: 'sara@example.com', role: 'owner', joinedAt: '2026-08-01T00:00:00Z' },
    { userId: 'u-2', name: 'Tsehay Abebe', email: 'tsehay@example.com', role: 'contributor', joinedAt: '2026-08-14T00:00:00Z' },
    { userId: 'u-3', name: 'Mikael Tesfaye', email: 'mikael@example.com', role: 'contributor', joinedAt: '2026-08-20T00:00:00Z' },
    { userId: 'u-4', name: 'Bethlehem Girma', email: 'bethlehem@example.com', role: 'viewer', joinedAt: '2026-09-02T00:00:00Z' },
  ];

  const invitations: InvitationDto[] = [
    { id: 'inv-1', email: 'nahom@example.com', role: 'contributor', status: 'pending', inviteUrl: 'https://familytree.app/invite/9f3k…', createdAt: '2026-09-25T00:00:00Z', expiresAt: '2026-10-25T00:00:00Z' },
  ];

  const memories: MemoryDto[] = [
    {
      id: 'mem-1', familyId: fam.id, title: 'Grandfather Abebe\'s Teachers College Diploma',
      description: 'The original certificate awarded in 1968 after completing teacher training in Gondar.',
      type: 'document', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      dateLabel: 'c. 1968', personIds: ['p-abebe'], location: 'Gondar, Ethiopia', createdAt: '2026-09-02T10:00:00Z',
    },
    {
      id: 'mem-2', familyId: fam.id, title: 'Hana & Abebe Wedding Portrait',
      description: 'Formal studio photograph taken following their wedding in Addis Ababa.',
      type: 'photo', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
      dateLabel: '1970', personIds: ['p-abebe', 'p-hana'], location: 'Addis Ababa, Ethiopia', createdAt: '2026-09-04T12:00:00Z',
    },
    {
      id: 'mem-3', familyId: fam.id, title: 'Oral Blessing: Grandfather Abebe on Family Unity',
      description: 'Audio recording of Abebe sharing memories of walking across the Simien mountains and blessing his grandchildren.',
      type: 'audio', url: 'https://cdn.freesound.org/previews/512/512689_11200236-lq.mp3',
      audioDuration: '04:12', dateLabel: 'c. 2012', personIds: ['p-abebe', 'p-sara'], location: 'Addis Ababa', createdAt: '2026-09-10T14:00:00Z',
    },
    {
      id: 'mem-4', familyId: fam.id, title: 'Meskel Celebration Feast in the Courtyard',
      description: 'Gathering of three generations around the Demera fire and traditional feast.',
      type: 'photo', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
      dateLabel: '1998', personIds: ['p-sara', 'p-daniel', 'p-mikael'], location: 'Bole, Addis Ababa', createdAt: '2026-09-12T16:00:00Z',
    },
    {
      id: 'mem-5', familyId: fam.id, title: 'Grandmother Hana\'s Coffee Song & Chant',
      description: 'Spoken poetry recited during the third pouring (Baraka) of the Sunday morning coffee ceremony.',
      type: 'audio', url: 'https://cdn.freesound.org/previews/467/467657_9497060-lq.mp3',
      audioDuration: '02:35', dateLabel: '2005', personIds: ['p-hana'], location: 'Addis Ababa', createdAt: '2026-09-15T09:00:00Z',
    },
  ];

  return {
    user, families: [fam], activeFamilyId: fam.id,
    people, relationships, stories, memories, history, activity, members, invitations,
  };
}

export { uid };
