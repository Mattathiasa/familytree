import type { FamilyDate, Role, Visibility } from '@ft/domain';

/* Types mirror API.md §1–§8. The mock data layer and a future live client
   both speak exactly these shapes, so swapping the transport is local. */

/** Per-user reminder and digest preferences (spec §40, §42: every reminder
    must be individually disableable). */
export interface NotificationPrefs {
  contentAdded: boolean;
  occasions: boolean;
  weeklyDigest: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  contentAdded: true,
  occasions: true,
  weeklyDigest: false,
};

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  locale: 'en' | 'am';
  notifications?: NotificationPrefs;
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
  /* The account that has claimed this profile, if any. A person is not a user
     (spec §16, §23) — historical people have no account — but a living member
     may claim their own record, which is what makes "me" expressible. */
  userId?: string | null;
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
  familyId: string;
  title: string;
  body: string;
  /* authorName is for display; authorId is what draft isolation is decided on
     (SECURITY.md §11.5) — names are neither unique nor stable. */
  authorId: string;
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
  familyId: string;
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
  familyId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface InvitationDto {
  id: string;
  familyId: string;
  email: string;
  role: Role;
  status: 'pending' | 'accepted' | 'revoked' | 'rejected';
  /* The bearer credential in the link. Stored separately from inviteUrl so the
     lookup and the shareable URL cannot drift apart (SECURITY.md §12: invite
     links are bearer tokens — short expiry, single use, revocable). */
  token: string;
  inviteUrl: string;
  createdAt: string;
  expiresAt: string;
}

/** What `GET /invitations/:token` shows before you sign in (API.md §3). */
export interface InvitationPreviewDto {
  familyName: string;
  role: Role;
  status: InvitationDto['status'];
  expired: boolean;
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
