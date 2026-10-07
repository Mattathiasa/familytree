import type { FamilyDate, Role, Visibility } from '@ft/domain';

/* Types mirror API.md §1–§8. The mock data layer and a future live client
   both speak exactly these shapes, so swapping the transport is local. */

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  locale: 'en' | 'am';
}

export interface FamilySummary {
  id: string;
  name: string;
  description: string;
  role: Role;
  peopleCount: number;
  coverGradient?: number;
  lineage?: FamilyLineage;
}

export interface PersonDto {
  id: string;
  familyId: string;
  givenName: string;
  middleName?: string;
  familyName?: string;
  nickname?: string;
  gender: 'female' | 'male' | 'other' | 'unknown';
  birthDate: FamilyDate | null;
  deathDate: FamilyDate | null;
  isLiving?: boolean | null;
  biography: string;
  occupation: string;
  birthPlace: string;
  deathPlace: string;
  photoUrl: string | null;
  visibility: Visibility;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type RelationshipKind = 'parent' | 'spouse';

export interface RelationshipDto {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  kind: RelationshipKind;
  nature: 'biological' | 'adoptive' | 'step' | 'legal' | 'foster' | 'unknown';
  marriedDate?: FamilyDate | null;
}

export interface RelativeGroups {
  parents: Array<{ person: PersonDto; nature: string }>;
  spouses: Array<{ person: PersonDto; marriedDate: FamilyDate | null }>;
  children: Array<{ person: PersonDto; nature: string }>;
  siblings: Array<{ person: PersonDto }>;
}

export interface ChangeRecordDto {
  id: string;
  personId: string;
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  actorName: string;
  at: string;
}

export interface StoryDto {
  id: string;
  title: string;
  body: string;
  authorName: string;
  periodLabel: string;
  status: 'draft' | 'published';
  personIds: string[];
  audioUrl?: string;
  audioDuration?: string;
  updatedAt: string;
}

export interface MemoryDto {
  id: string;
  familyId: string;
  title: string;
  description: string;
  type: 'photo' | 'audio' | 'document';
  url: string;
  audioDuration?: string;
  dateLabel?: string;
  personIds: string[];
  location?: string;
  createdAt: string;
}

export interface ActivityItemDto {
  id: string;
  actorName: string;
  verb: string;
  summary: string;
  at: string;
}

export interface UpcomingItemDto {
  id: string;
  personId: string;
  personName: string;
  kind: 'birthday' | 'anniversary';
  label: string;
  inDays: number;
  permitted: boolean;
}

export interface FamilyStatsDto {
  people: number;
  generations: number;
  stories: number;
  photos: number;
  oldestBirthYear: number | null;
  newestBirthYear: number | null;
}

export interface MemberDto {
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface InvitationDto {
  id: string;
  email: string;
  role: Role;
  status: 'pending' | 'accepted' | 'revoked' | 'rejected';
  inviteUrl: string;
  createdAt: string;
  expiresAt: string;
}

export interface TreeResponseDto {
  root: string;
  direction: 'descendant' | 'ancestor';
  nodes: PersonDto[];
  edges: RelationshipDto[];
  hasMore: boolean;
}

export type FamilyLineage = 'ethiopian' | 'general';

export interface ApiError {
  error: {
    code:
      | 'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'EMAIL_UNVERIFIED' | 'FORBIDDEN'
      | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' | 'PAYLOAD_TOO_LARGE'
      | 'UNSUPPORTED_MEDIA' | 'INTERNAL';
    message: string;
    fields?: Record<string, string>;
  };
}
