# FamilyTree — Database Design

> **Status:** design, not yet migrated. Migrations land in `packages/db/migrations/`.
> Companion: `ARCHITECTURE.md` (why Postgres), `SECURITY.md` (enforcement), `PRODUCT_PLAN.md` §6 (requirements).

---

## 1. Why relational

Genealogy is a graph of typed edges sitting on top of entities with heavy relational queries: "children of X", "all ancestors of Y within 5 generations", "people born in Gondar who are not already linked". Postgres recursive CTEs answer these directly and correctly, inside a transaction, with indexes. A document store turns each of those into a hand-written aggregation, loses foreign keys, and makes the multi-user conflict handling in `PRODUCT_PLAN.md` §9 materially harder. The model is relational by nature, so the store is relational.

Two graph-shaped problems have graph-shaped answers, and both stay in Postgres:

- **Ancestry/kinship** → recursive CTEs over `relationships` (`DATABASE.md` §5.3).
- **Cycle prevention** → a recursive check at write time plus a trigger-level guard. Not a deferred constraint — Postgres cannot express graph acyclicity declaratively, so it is enforced in the service transaction and covered by tests (risk R-3).

---

## 2. Conventions

| Convention | Rule | Why |
|---|---|---|
| Primary key | `uuid` (UUIDv7) | Time-ordered → index locality, good keyset pagination. Not sequential, so ids leak no counts. |
| Tenancy | Every family-scoped table has `family_id uuid not null` | The tenancy boundary. Missing one is a data leak, so it is a guard, not a convention (see §7). |
| Timestamps | `timestamptz`, `not null default now()` | `timestamp` without a zone loses meaning the moment a family is abroad. |
| Soft delete | `deleted_at timestamptz null` | Spec §68. Absent = live. |
| Money/dates | never text | See §4. |
| Enums | Postgres `enum` types for closed sets | DB-enforced; adding a value is a migration, not a silent string. |
| Names | `not null default ''` on optional text | Avoids `null` vs `''` ambiguity for "unknown but present". |
| Money of money | none | Not applicable. |
| Enforced invariants | `check`, `unique`, FK — never only application code | The database is the last line of defence. |

**A note on nullability:** optional data is genuinely optional (spec §13, §81 — "never force the user to enter information they don't have"). But the *structure* is not: a person always has a `family_id`, always has `created_by`, and always has a `visibility`. The absence of a birth year is `birth_date is null`; the absence of a family is a bug.

---

## 3. Entity relationship overview

```
User ──1:N── FamilyMember ──N:1── Family
  │                                    │
  │                                    ├──1:N── Person ──1:N── Relationship
  │                                    │            │  (self-referencing edges)
  │                                    │            │
  │                                    │            ├──1:N── PersonPlace ──N:1── Place
  │                                    │            ├──1:N── Media
  │                                    │            ├──1:N── Story (author)
  │                                    │            └──1:N── Event (participants)
  │                                    │
  │                                    ├──1:N── Story ──N:M── Person
  │                                    ├──1:N── Event ──N:M── Person
  │                                    ├──1:N── Album ──1:N── Media
  │                                    ├──1:N── Invitation
  │                                    ├──1:N── Notification
  │                                    ├──1:N── Activity
  │                                    ├──1:N── ChangeRecord
  │                                    └──1:N── Source
  │
  ├──1:N── Session
  └──1:N── PersonClaim (user claims a profile)

User ──1:N── Story (author)          Person is NOT a User (spec §16)
```

---

## 4. Core tables

### `users`

```sql
create table users (
  id              uuid primary key default gen_random_uuid(),
  email           citext not null unique,
  email_verified_at timestamptz,
  password_hash   text not null,          -- argon2id, never returned by any query
  display_name    text not null default '',
  locale          text not null default 'en',
  default_calendar text not null default 'gregorian',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,

  constraint users_locale_known check (locale in ('en','am'))
);
```

`password_hash` is never selected into an API response. The repository exposes a dedicated auth projection so the hash cannot leak by accident through a careless `select *`.

### `sessions`

```sql
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  token_hash   bytea not null unique,     -- sha-256 of the cookie token
  user_agent   text,
  ip_address   inet,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  revoked_at   timestamptz
);
create index sessions_user_active_idx on sessions(user_id) where revoked_at is null;
```

Storing `token_hash` rather than the token means a database read cannot impersonate a user. Listing and revoking sessions is a spec requirement (§6).

### `families`

```sql
create table families (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) > 0),
  description  text not null default '',
  cover_media_id uuid,
  visibility   visibility_level not null default 'family',
  default_calendar text not null default 'gregorian',
  created_by   uuid not null references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
```

### `family_members`

```sql
create type family_role as enum ('owner','admin','contributor','viewer');

create table family_members (
  family_id  uuid not null references families(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  role       family_role not null default 'viewer',
  invited_by uuid references users(id),
  joined_at  timestamptz not null default now(),
  primary key (family_id, user_id)
);
```

Composite PK: one role per user per family, enforced by the database. A user in three families holds three independent roles — there is no global "family role" anywhere in this schema, which is exactly the confusion the spec warns about in §16.

### `people`

```sql
create type visibility_level as enum ('private','family','selected','public');
create type gender as enum ('female','male','other','unknown');

create table people (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,

  given_name    text not null default '',
  middle_name   text not null default '',
  family_name   text not null default '',
  nickname      text not null default '',
  -- display name is derived, not stored (see below)

  gender        gender not null default 'unknown',
  profile_media_id uuid,
  cover_media_id   uuid,

  birth_date    family_date,
  death_date    family_date,
  is_living     boolean,          -- null = inferred, not asserted

  biography     text not null default '',
  occupation    text not null default '',
  education     text not null default '',
  languages     text[] not null default '{}',
  current_place_id uuid references places(id),
  notes         text not null default '',

  visibility    visibility_level not null default 'family',
  created_by    uuid not null references users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  version       integer not null default 1   -- optimistic concurrency
);
```

**`display_name` is deliberately not a column.** It is derived (nickname, else given + family, else whatever exists) in one shared function. Storing it would create two sources of truth that drift the moment a name is edited — the exact "hardcoded family data" failure spec §92 Rule 3 warns against. Derived once, in `packages/domain`, used by the server and the client alike.

**`is_living` is nullable.** `null` means "not asserted" and is resolved at read time: a person with a death date is not living; a person born within the last ~110 years is treated as living for privacy purposes. Asserting it explicitly lets a family mark someone living after 110 years, which is rare but real. Getting this wrong exposes a living person's data, so it is one of the most heavily tested pieces of logic in the product.

**`version`** gives optimistic concurrency: an edit carries the version it read, and a mismatch is a `ConflictError` rather than a silent overwrite (spec §49, risk R-4).

### `family_date` — a structured date type

This is the type most likely to be done wrong, and getting it wrong corrupts real history (risk R-9). Spec §32 and §76 both forbid arbitrary strings and require approximate dates.

```sql
create type calendar_system as enum ('gregorian','ethiopic');
create type date_precision as enum
  ('exact','month_year','year','circa','range','unknown');

create type family_date as (
  calendar     calendar_system not null,
  precision    date_precision   not null,
  year         int,              -- null only when precision = 'unknown'
  month        int,              -- 1-12, null unless precision in ('exact','month_year')
  day          int,              -- 1-31, null unless precision = 'exact'
  end_year     int,              -- populated for precision = 'range'
  end_month    int,
  end_day      int
);
```

A composite type gives structure with one column, which keeps "sort people by birth" a plain indexable sort instead of a per-row JSON parse. Constraints enforce internal consistency:

```sql
check (
  (precision = 'exact'      and year is not null and month is not null and day is not null) or
  (precision = 'month_year' and year is not null and month is not null and day is null)     or
  (precision in ('year','circa') and year is not null and month is null and day is null)     or
  (precision = 'range'      and year is not null and end_year is not null)                  or
  (precision = 'unknown'    and year is null)
);
check (month is null or month between 1 and 12);
check (day   is null or day   between 1 and 31);
```

**`circa 1948` and `1948` are different facts.** Collapsing them loses real information, and the `circa` marker is the difference between a fact and a guess. The precision is preserved end to end: stored, rendered, and exported to GEDCOM qualifiers.

Ethiopic dates are stored in the calendar the family used. Conversion to Gregorian happens at display time, in `packages/domain`, never destructively in storage. Storing a converted date would lose the original — and if the conversion has a bug, the original data is gone.

### `relationships` — the graph edge

```sql
create type relationship_kind as enum
  ('parent','spouse','sibling','guardian');
create type relationship_nature as enum
  ('biological','adoptive','step','legal','foster','unknown');

create table relationships (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,

  from_person_id uuid not null references people(id) on delete cascade,
  to_person_id   uuid not null references people(id) on delete cascade,

  kind          relationship_kind not null,
  nature        relationship_nature not null default 'biological',

  -- spouse-specific
  married_date  family_date,
  divorced_date family_date,
  marriage_place_id uuid references places(id),

  visibility    visibility_level not null default 'family',
  source_id     uuid references sources(id),   -- provenance (spec §50)
  confidence    smallint not null default 3 check (confidence between 1 and 5),
  notes         text not null default '',
  created_by    uuid not null references users(id),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint relationships_no_self check (from_person_id <> to_person_id),
  constraint relationships_unique unique (from_person_id, to_person_id, kind)
    where deleted_at is null
);
```

**Why edges are directed.** A parent/child relation is stored as `from = parent, to = child`; a sibling relation is stored once as a canonical ordering (lower uuid first) and expanded symmetrically at read time. The alternative — an undirected edge with a `direction` column — makes "children of X" need an `or` across both columns, and makes a family with 1,000 people noticeably slower on the one query the product is built around. The cost is that sibling reads must expand; that query is rare, so the trade is correct.

**Sibling is derived, not stored.** Two people are siblings if they share a parent. Storing sibling edges would double the graph, create contradiction risk (a sibling edge that disagrees with a parent edge), and require resolution logic. Instead a view exposes them:

```sql
create view siblings as
select p1.id as person_id, p2.id as sibling_id, p1.family_id
from relationships r1
join relationships r2 on r2.kind = 'parent'
  and r2.from_person_id = r1.from_person_id
  and r2.to_person_id <> r1.to_person_id
join people p1 on p1.id = r1.to_person_id
join people p2 on p2.id = r2.to_person_id
where r1.kind = 'parent' and r1.deleted_at is null and r2.deleted_at is null;
```

One source of truth. A family cannot end up with two contradictory truths about who is whose sibling.

**`confidence`** (1–5) is the lightweight form of spec §50's sources: it lets a historian mark a claim as unverified without building the full evidence UI in MVP.

---

## 5. Content tables

### `media`

One table for photo/video/audio/document metadata, because they share access control, privacy, provenance, and lifecycle. The kind-specific columns live in child tables so a photo does not carry audio duration columns.

```sql
create type media_kind as enum ('photo','video','audio','document');

create table media (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  kind          media_kind not null,
  storage_key   text not null unique,     -- opaque, unguessable
  original_filename text,
  mime_type     text not null,
  byte_size     bigint not null check (byte_size > 0),
  checksum      text,                     -- sha256, for dedupe + integrity
  title         text not null default '',
  caption       text not null default '',
  description   text not null default '',
  taken_date    family_date,
  place_id      uuid references places(id),
  visibility    visibility_level not null default 'family',
  uploaded_by   uuid not null references users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint media_key_not_blank check (length(storage_key) > 0)
);
```

`storage_key` is a server-generated opaque value. Users never supply it, so a crafted key cannot address another family's file. **No public URL column exists** — every read mints a short-lived signed URL after an authorization check (`ARCHITECTURE.md` §5).

`checksum` enables deduplication within a family and integrity verification, which matters when a family's archive must survive for decades.

### Kind-specific child tables

```sql
create table media_photos (
  media_id      uuid primary key references media(id) on delete cascade,
  width int, height int,
  taken_location_geo point,          -- nullable, opt-in; geo is sensitive
  dominant_color text
);

create table media_video (
  media_id      uuid primary key references media(id) on delete cascade,
  duration_seconds numeric(10,3),
  width int, height int,
  poster_media_id uuid references media(id)
);

create table media_audio (
  media_id      uuid primary key references media(id) on delete cascade,
  duration_seconds numeric(10,3),
  transcript    text,                 -- nullable; audio is never gated on it
  transcript_language text,
  transcript_status text not null default 'none'  -- none|pending|done|failed
);
```

**The original audio is always playable** (spec §30). `transcript` is nullable and `transcript_status` defaults to `none`; no query path may require a transcript to exist.

### `people_media` — photo tagging (manual, per spec §27)

```sql
create table people_media (
  person_id uuid not null references people(id) on delete cascade,
  media_id  uuid not null references media(id) on delete cascade,
  region    jsonb,          -- optional bounding box, nullable
  tagged_by uuid not null references users(id),
  tagged_at timestamptz not null default now(),
  primary key (person_id, media_id)
);
```

`region` is nullable and unused in MVP — the schema is ready for face-box tagging later without a migration, but **there is no automatic face recognition anywhere in this product** (spec §27).

### `stories` and `story_people`

```sql
create table stories (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  author_id  uuid not null references users(id),
  title      text not null check (length(btrim(title)) > 0),
  body       text not null default '',
  cover_media_id uuid references media(id),
  told_date  family_date,          -- when the story happened (may differ from written)
  period_label text not null default '',  -- "circa the 1960s"
  place_id   uuid references places(id),
  status     story_status not null default 'draft',  -- draft|published
  visibility visibility_level not null default 'family',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version    integer not null default 1,
  constraint stories_published_have_title check (status <> 'published' or length(btrim(title)) > 0)
);

create table story_people (
  story_id uuid not null references stories(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  role     text not null default 'subject',
  primary key (story_id, person_id)
);
```

`status = 'draft'` means a draft is visible only to its author regardless of `visibility` — a family member must not publish half a story by accident. Enforced in the permission predicate, not by hoping the UI is careful.

`body` is sanitised structured text (a constrained Markdown/ProseMirror document), never raw HTML. Spec §66 requires XSS prevention; storing sanitised structured text makes escaping a property of the format rather than a rule someone must remember at every render site.

### `events` and `event_people`

```sql
create type event_type as enum
  ('birth','marriage','death','graduation','baptism','birthday',
   'anniversary','migration','career','reunion','custom');

create table events (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  type       event_type not null,
  title      text not null default '',
  date       family_date,
  end_date   family_date,
  place_id   uuid references places(id),
  description text not null default '',
  is_recurring boolean not null default false,
  visibility visibility_level not null default 'family',
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version    integer not null default 1
);

create table event_people (
  event_id uuid not null references events(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  role      text not null default 'participant',
  primary key (event_id, person_id)
);
```

`is_recurring` + `is_recurring` dates drive birthdays and anniversaries (spec §41, §42). Recurrence is computed in the worker, never stored as an expanded series — expanding a daily memorial would be an unbounded row explosion.

### `places` — reusable, with deduplication

```sql
create table places (
  id        uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name      text not null check (length(btrim(name)) > 0),
  region    text not null default '',
  country   text not null default '',
  country_code char(2),
  geo       point,
  place_type text not null default '',   -- city|town|village|region|country|building
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index places_name_trgm_idx on places using gin (name gin_trgm_ops);
```

Spec §34 says places are reusable and duplicates should not proliferate. A `unique (family_id, lower(name), lower(country)) where deleted_at is null` constraint enforces that at the database level, and the UI offers existing matches as suggestions instead of forcing the user to remember. Geo is nullable and opt-in — a family's migration history is meaningful, but precise coordinates on a family home are sensitive.

### `albums`, `album_media`

```sql
create table albums (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  cover_media_id uuid references media(id),
  visibility visibility_level not null default 'family',
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table album_media (
  album_id uuid not null references albums(id) on delete cascade,
  media_id  uuid not null references media(id) on delete cascade,
  position  integer not null default 0,
  added_at  timestamptz not null default now(),
  primary key (album_id, media_id)
);
```

`position` gives manual ordering without a drag-and-drop dependency; reordering is a single indexed update rather than a rewrite.

---

## 6. Collaboration tables

### `invitations`

```sql
create type invitation_status as enum ('pending','accepted','revoked','expired');

create table invitations (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  email       citext not null,
  role        family_role not null default 'viewer',
  token_hash  bytea not null unique,
  status      invitation_status not null default 'pending',
  invited_by  uuid not null references users(id),
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references users(id),
  created_at  timestamptz not null default now()
);
create index invitations_pending_idx on invitations(family_id, email) where status = 'pending';
create unique index invitations_one_pending_per_email
  on invitations(family_id, email) where status = 'pending';
```

The partial unique index makes a duplicate pending invite impossible — a re-invite updates the existing row rather than creating a second valid link. **An invite grants nothing until accepted** (spec §18): the token is inert, single-use, expiring, and only creates a `family_members` row on acceptance.

### `person_claims` — user claims a historical profile (spec §16)

```sql
create table person_claims (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  status    text not null default 'pending',  -- pending|approved|rejected
  claimed_at timestamptz not null default now(),
  decided_by uuid references users(id),
  decided_at timestamptz,
  unique (person_id, user_id)
);
```

A person entity never *becomes* a user. The link is separate and requires approval, because claiming a profile is a claim about identity and must be verified by the family — an unverifiable self-assertion is exactly how a stranger's information ends up inside a private archive.

### `activity` and `notifications`

```sql
create table activity (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  actor_id   uuid references users(id),       -- null for system actions
  verb       text not null,                  -- 'person.created'
  object_type text not null,
  object_id  uuid,
  summary    text not null default '',
  visibility visibility_level not null default 'family',
  created_at timestamptz not null default now()
);
create index activity_family_recent_idx on activity(family_id, created_at desc);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  family_id  uuid references families(id) on delete cascade,
  kind       text not null,
  object_type text,
  object_id  uuid,
  payload    jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_unread_idx on notifications(user_id, created_at desc) where read_at is null;
```

`activity` carries its own `visibility` so a private action is not broadcast in the feed (spec §39). `summary` is a pre-rendered human sentence, because a feed entry that leaks a private person's name by composing text at read time is a privacy bug waiting to happen.

### `sources` and `change_records`

```sql
create table sources (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  type       text not null,   -- document|interview|church|government|family_member|photo|other
  title      text not null,
  citation   text not null default '',
  media_id   uuid references media(id),
  url        text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table change_records (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  entity_type text not null,
  entity_id   uuid not null,
  field       text not null,
  old_value   jsonb,
  new_value   jsonb,
  actor_id    uuid references users(id),
  reason      text,
  created_at  timestamptz not null default now()
);
create index change_records_entity_idx on change_records(entity_type, entity_id, created_at desc);
```

`change_records` is the audit history spec §48 requires. It is written in the same transaction as the change, so history cannot be lost by a failed write, and it stores both old and new values — enough to show "Sarah changed Abebe's birth year, 1947 → 1948" without replaying anything.

`url` on `sources` is validated on write (https only, no javascript: or data: schemes) and is never fetched server-side, so it cannot be used for SSRF.

---

## 7. Indexes and query patterns

| Query | Index |
|---|---|
| People list by name | `people(family_id, family_name, given_name) where deleted_at is null` |
| People by place of birth | `people(family_id, (birth_date).year)` — partial expression index |
| Children of X | `relationships(from_person_id, kind) where deleted_at is null` |
| Parents of X | `relationships(to_person_id, kind) where deleted_at is null` |
| Ancestry (recursive) | supported by the two indexes above as the recursive join driver |
| Family media gallery | `media(family_id, created_at desc) where deleted_at is null` |
| Search people | `people using gin (search_vector)` + `places using gin (name gin_trgm_ops)` |
| Feed | `activity_family_recent_idx` (§6) |
| Unread notifications | `notifications_unread_idx` (§6) |

Every index is partial (`where deleted_at is null`) where soft-deleted rows would otherwise dominate as an archive grows. A family that deletes a great deal of history should not pay for it in index size forever.

**Generated search vector:** a stored `tsvector` concatenating given, family, and nickname names, weighted so an exact surname match outranks a match in a biography. Generated columns mean the vector cannot drift from the source columns.

**Pagination:** keyset only — `where (created_at, id) < ($1, $2) order by created_at desc, id desc`. Never `OFFSET`; it degrades linearly and gets worst exactly when a family is largest, and it shifts rows under concurrent inserts.

---

## 8. Constraints and integrity summary

| Rule | Enforced by |
|---|---|
| A person cannot be their own parent | `check (from <> to)` + service-layer cycle check |
| No cycles in the ancestor graph | Recursive CTE in the service transaction (DB cannot express this) |
| One role per user per family | Composite PK on `family_members` |
| One pending invite per email per family | Partial unique index |
| No duplicate relationship edges | Partial unique index |
| No duplicate place per family | Partial unique unique index |
| Date precision is internally consistent | `check` constraints on `family_date` |
| File size > 0 | `check` on `media.byte_size` |
| Published stories have titles | `check` constraint |
| Tenant isolation | `family_id not null` on every family-scoped table + repository guard |
| No storage key authored by a user | `storage_key` server-generated; no client-supplied path column |

---

## 9. Multi-tenancy and the tenancy guard

Every family-scoped query must filter by a resolved `family_id`. Forgetting one `WHERE` clause is a cross-family data leak — the most severe class of bug this product can have (risk R-1).

It is not left to discipline. The repository layer requires a `FamilyScope` in the constructor:

```ts
class PersonRepository {
  constructor(private readonly scope: FamilyScope, private readonly db: Db) {}
  // every method uses this.scope.familyId — there is no parameter to forget
}
```

A repository cannot be constructed without a resolved scope, so the "omitted tenant filter" bug is a compile error rather than an audit finding. Cross-family work (a user's own family list, search across their families) uses an explicit, separately-audited code path.

---

## 10. Soft delete and lifecycle

- Deleting sets `deleted_at`; the row stays queryable for restore.
- Trash is `deleted_at is not null and deleted_at > now() - interval '30 days'`; a worker hard-deletes past that.
- Hard delete requires explicit confirmation and Owner/Admin role.
- **Person deletion is refused if the person participates in relationships**, unless `?cascade=true` is passed with Owner role, which is itself audited. A dangling edge renders a broken tree.
- Media is never hard-deleted with the row: the storage object is retained for 30 days, so an accidental delete is recoverable — the archive outlives the mistake (spec §87).

---

## 11. Row-level security

`SECURITY ROW LEVEL SECURITY` is enabled on all family-scoped tables as a **defence-in-depth backstop**, with policies that assert `family_id` matches a family the current role belongs to. The application authorizes in the service layer; RLS means a query that bypasses the repository layer — a psql session, a bug, a compromised code path — still cannot read across families.

Both layers are required deliberately. Application authorization alone fails the day someone writes a raw query.

---

## 12. What is deliberately absent from MVP

`branches`, `comments`, `tags`, `person_place` (places relate to people via events and events relate to people), `reminders`, `transcripts`-backed search, and any AI-derived table.

On `person_place`: spec §69 lists it, but a person's link to a place is always *through* something — born, died, lived, married, migrated. Modelling it as a bare join table would lose the reason for the association. `event_people` carries `role`, so the reason survives. This is the spec's "do not blindly implement this exact list" instruction applied literally (§69).

The branch concept is a view over the same graph, so no table is needed until branching carries real semantics.
