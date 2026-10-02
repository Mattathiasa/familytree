# FamilyTree — API Reference

> **Status:** contract design. Endpoints are stable once implemented; the client is generated from these types.
> Companion: `ARCHITECTURE.md` (layering), `DATABASE.md` (schema), `SECURITY.md` (who may call what).

---

## 1. Conventions

**Base URL** `/api/v1`

**Content type** `application/json; charset=utf-8`

**Transport** HTTPS only. Cookies carry the session; there is no bearer token. `SameSite=Lax` plus an origin check gives CSRF protection for state-changing requests (see §7).

**Authentication** — session cookie `__Host-ft_session`. All endpoints except `/auth/*` and health require it.

**Authorization** — enforced per route. A `family_id` in the path is always cross-checked against the caller's membership; the server never trusts a family id from the client.

### 1.1 Success

```json
{ "data": { ... } }
```

Lists:
```json
{ "data": [ ... ], "page": { "nextCursor": "eyJ...", "hasMore": true } }
```

### 1.2 Errors

One shape, always. No stack traces, no SQL, no internal identifiers.

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some of the details you entered need attention.",
    "fields": { "email": "Enter a valid email address." },
    "requestId": "req_01H..."
  }
}
```

`message` is written for the person reading it, not for a log. `fields` maps to inputs so the form can anchor errors. `requestId` is quoteable in support.

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Input rejected; `fields` populated |
| `UNAUTHENTICATED` | 401 | No or expired session |
| `EMAIL_UNVERIFIED` | 403 | Action requires a verified email |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Absent, **or** present but invisible to this caller |
| `CONFLICT` | 409 | Version conflict or unique violation |
| `RATE_LIMITED` | 429 | Slow down; `Retry-After` set |
| `PAYLOAD_TOO_LARGE` | 413 | Body or upload too large |
| `UNSUPPORTED_MEDIA` | 415 | Type not accepted for this endpoint |
| `INTERNAL` | 500 | Unexpected; `requestId` is the only handle |

**404 rather than 403 for invisible records is deliberate.** A family archive is private; confirming that a record exists is itself a leak. A caller who cannot see a record gets the same response as one where it does not exist.

### 1.3 Pagination

Keyset, never `OFFSET` (`DATABASE.md` §7). Opaque cursor:

```
GET /families/:familyId/people?limit=50&cursor=eyJjcmVhdGVkX2F0Ijoi...
```

`limit` defaults to 50, max 200. An invalid or stale cursor is a `VALIDATION_FAILED`, never a silent reset to page 1.

### 1.4 Dates

Dates are structured, never strings (`DATABASE.md` §4):

```json
{ "calendar": "gregorian", "precision": "circa", "year": 1948 }
```

Unknown is `{"precision": "unknown"}`. Rejecting a naive date string at the boundary is what stops precision being lost on the first round-trip.

---

## 2. Authentication

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | Rate limited by IP. Returns `EMAIL_UNVERIFIED` state |
| POST | `/auth/login` | — | Rate limited by IP **and** by account. Generic failure message |
| POST | `/auth/logout` | ✓ | Revokes the current session |
| GET | `/auth/session` | ✓ | Current user + families + roles |
| POST | `/auth/verify-email` | ✓ | Consumes the emailed token |
| POST | `/auth/resend-verification` | ✓ | Rate limited |
| POST | `/auth/password/forgot` | — | Always `200`, whether or not the email exists |
| POST | `/auth/password/reset` | — | Single-use token; revokes all other sessions |
| GET | `/auth/sessions` | ✓ | Active sessions for revocation |
| DELETE | `/auth/sessions/:id` | ✓ | Revoke one |

`POST /auth/register`

```json
{ "email": "sara@example.com", "password": "…", "displayName": "Sara" }
```

`201` → `{ "data": { "id": "…", "emailVerified": false } }`

Login failures are deliberately indistinguishable between "no such user" and "wrong password", and the response time does not reveal which either.

`GET /auth/session`

```json
{ "data": {
  "user": { "id": "…", "email": "…", "displayName": "Sara", "locale": "en" },
  "families": [
    { "id": "…", "name": "Abraham Family", "role": "owner", "peopleCount": 184 }
  ]
} }
```

The client never stores a role; it reads it from here, and the server independently enforces it.

---

## 3. Families

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/families` | ✓ | Families the caller belongs to |
| POST | `/families` | ✓ | Creator becomes `owner` |
| GET | `/families/:familyId` | viewer | Detail + stats |
| PATCH | `/families/:familyId` | admin | Name, description, calendar, visibility |
| DELETE | `/families/:familyId` | owner | Soft; `confirm` required |
| GET | `/families/:familyId/dashboard` | viewer | Stats, activity, upcoming |
| GET | `/families/:familyId/members` | viewer | Roster with roles |
| PATCH | `/families/:familyId/members/:userId` | admin | Change role |
| DELETE | `/families/:familyId/members/:userId` | admin | Cannot remove the last owner |
| POST | `/families/:familyId/invitations` | admin | Returns the link |
| GET | `/families/:familyId/invitations` | admin | Pending list |
| DELETE | `/families/:familyId/invitations/:id` | admin | Revoke |

`POST /families`

```json
{ "name": "Abraham Family", "description": "Our family history…" }
```

`201` → `{ "data": { "id": "…", "name": "…", "role": "owner" } }`

`POST /families/:familyId/invitations`

```json
{ "email": "daniel@example.com", "role": "contributor" }
```

`201` → `{ "data": { "id": "…", "status": "pending", "inviteUrl": "…", "expiresAt": "…" } }`

The invite grants nothing until accepted (`DATABASE.md` §6). `email` is optional — omit it to get a link to share with someone whose address you do not have.

### Public invite endpoints (unauthenticated)

| Method | Path | Notes |
|---|---|---|
| GET | `/invitations/:token` | Preview: family name, inviter, role offered |
| POST | `/invitations/:token/accept` | Requires a session; creates the membership |
| POST | `/invitations/:token/reject` | Marks rejected |

Accepting requires an authenticated user; an unauthenticated caller is sent to register/login and returns with the token intact.

---

## 4. People

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/families/:familyId/people` | viewer | Filter/search/paginate |
| POST | `/families/:familyId/people` | contributor | |
| GET | `/families/:familyId/people/:personId` | viewer | Profile + relatives |
| PATCH | `/families/:familyId/people/:personId` | contributor | Requires `version` |
| DELETE | `/families/:familyId/people/:personId` | admin | Soft; `cascade` opt-in |
| GET | `/families/:familyId/people/:personId/history` | viewer | Change records |
| POST | `/families/:familyId/people/:personId/claim` | ✓ | Request to link a profile |
| GET | `/families/:familyId/people/:personId/media` | viewer | Photos/videos/audio |

**List query parameters**

`?search=&givenName=&familyName=&bornAfter=&bornBefore=&placeId=&gender=&hasPhoto=&limit=&cursor=&sort=givenName|familyName|birthYear`

`GET /families/:familyId/people?search=abebe&limit=25`

```json
{ "data": [
  { "id": "…", "displayName": "Abebe Abraham", "givenName": "Abebe",
    "familyName": "Abraham", "birthDate": {"precision":"year","year":1948},
    "deathDate": null, "photoUrl": null, "visibility": "family" }
  ],
  "page": { "nextCursor": "eyJ…", "hasMore": false } }
```

`displayName` is computed server-side by the shared derivation in `packages/domain` and stored nowhere (`DATABASE.md` §4), so client and server can never disagree about a name.

`PATCH /families/:familyId/people/:personId`

```json
{ "version": 3, "patch": { "familyName": "Tesfaye", "birthDate": {"precision":"year","year":1947} } }
```

A stale `version` returns `409`:

```json
{ "error": { "code": "CONFLICT", "message": "Someone else updated this person while you were editing.",
  "current": { "version": 4, "familyName": "Abraham" } } }
```

This is the mechanism that stops a relative's work being silently overwritten (spec §49, risk R-4).

---

## 5. Relationships

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/families/:familyId/relationships` | viewer | Filter by person, kind |
| POST | `/families/:familyId/relationships` | contributor | Cycle-checked |
| PATCH | `/families/:familyId/relationships/:id` | contributor | |
| DELETE | `/families/:familyId/relationships/:id` | contributor | Soft |
| GET | `/families/:familyId/people/:personId/relatives` | viewer | Grouped relatives |
| GET | `/families/:familyId/people/:personId/ancestry` | viewer | Generations |
| GET | `/families/:familyId/people/:personId/descendants` | viewer | Depth-capped |

`POST /families/:familyId/relationships`

```json
{ "fromPersonId": "…", "toPersonId": "…", "kind": "parent",
  "nature": "biological", "sourceId": null, "confidence": 4 }
```

`201` → the created edge.

**A cycle is refused** — creating a link that would make someone their own ancestor returns `422` with a specific message:

```json
{ "error": { "code": "VALIDATION_FAILED",
  "message": "This connection would create a loop in the family tree." } }
```

**Relatives** are returned grouped, so the profile needs no extra requests:

```json
{ "data": {
  "parents":  [ { "id": "…", "displayName": "Sara Tesfaye", "nature": "biological" } ],
  "spouses":  [ { "id": "…", "displayName": "Hana Abraham", "marriedDate": {"precision":"year","year":1958} } ],
  "children": [ … ], "siblings": [ … ] } }
```

Siblings are derived from shared parents by a database view (`DATABASE.md` §4), never stored — so the API cannot return a sibling list that contradicts the parent links.

---

## 6. Tree

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/families/:familyId/tree` | viewer | **Subgraph**, not the whole family |
| GET | `/families/:familyId/tree/stats` | viewer | Generation and branch counts |

`GET /families/:familyId/tree?root=<personId>&depth=3&direction=descendant`

```json
{ "data": {
  "root": "…", "direction": "descendant", "maxDepth": 3,
  "nodes": [ { "id": "…", "displayName": "Abebe Abraham",
               "birthDate": {"precision":"year","year":1948},
               "photoUrl": null, "generation": 2, "collapsedCount": 0 } ],
  "edges": [ { "id": "…", "from": "…", "to": "…", "kind": "parent" } ],
  "hasMore": true } }
```

`depth` defaults to 2 and is capped at 6. A node with unloaded descendants carries `collapsedCount`, so the UI can show "+N" without a second request per node.

`root` may be omitted, defaulting to the most recent common ancestor of the caller's linked people. **The whole family is never returned unprompted** — that is what makes 1,000 people tractable (`ARCHITECTURE.md` §6).

---

## 7. Media

Upload is three steps; the API never proxies file bytes (`ARCHITECTURE.md` §5).

| Method | Path | Min role | Notes |
|---|---|---|---|
| POST | `/families/:familyId/media/upload-slot` | contributor | Allocate key; returns presigned PUT |
| POST | `/families/:familyId/media` | contributor | Confirm; creates the row |
| GET | `/families/:familyId/media` | viewer | Gallery; filter by person, year, place |
| GET | `/families/:familyId/media/:mediaId/url` | viewer | Short-lived signed GET |
| PATCH | `/families/:familyId/media/:mediaId` | contributor | Caption, date, people, visibility |
| DELETE | `/families/:familyId/media/:mediaId` | contributor | Soft |
| POST | `/families/:familyId/media/:mediaId/people` | contributor | Manual tagging |

`POST /families/:familyId/media/upload-slot`

```json
{ "kind": "photo", "mimeType": "image/jpeg", "byteSize": 2400000 }
```

```json
{ "data": { "mediaId": "…", "storageKey": "…",
  "uploadUrl": "https://…?X-Amz-Signature=…", "expiresIn": 900 } }
```

The slot validates declared size and type and returns a presigned URL scoped to that one key, that one content type, and that one size. The client then `PUT`s the bytes straight to storage, and confirms:

```json
{ "mediaId": "…", "checksum": "…" }
```

On confirm the server re-reads the object's magic bytes. **A file that does not sniff as the declared type is rejected and quarantined** — a mislabelled file is either a client bug or an attack, and either way it does not become family media.

`GET /families/:familyId/media/:mediaId/url` returns a signed URL valid for 5 minutes, minted only after a permission check. There is no permanent public URL, so revoking access takes effect immediately rather than when a leaked link expires.

---

## 8. Stories

| Method | Path | Min role |
|---|---|---|
| GET | `/families/:familyId/stories` | viewer |
| POST | `/families/:familyId/stories` | contributor |
| GET | `/families/:familyId/stories/:storyId` | viewer |
| PATCH | `/families/:familyId/stories/:storyId` | author or admin |
| POST | `/families/:familyId/stories/:storyId/publish` | author or admin |
| DELETE | `/families/:familyId/stories/:storyId` | author or admin |

`POST` body: `{ "title", "body", "toldDate", "placeId", "personIds": [], "mediaIds": [], "status": "draft" }`

A `draft` is visible only to its author, whatever `visibility` says (`DATABASE.md` §5). Publishing is a separate explicit call, so a half-finished story is never exposed by accident.

---

## 9. Search, activity, notifications

| Method | Path | Notes |
|---|---|---|
| GET | `/families/:familyId/search?q=&types=people,stories,media` | Typo-tolerant, permission-filtered |
| GET | `/families/:familyId/activity?limit=20&cursor=` | Permission-filtered feed |
| GET | `/notifications` | Caller's notifications |
| POST | `/notifications/:id/read` | Mark read |
| POST | `/notifications/read-all` | Mark all read |

**Search results are permission-filtered by the same predicates as normal reads.** A hit on a record the caller cannot open is not returned at all — a search result must never reveal the existence of a private record, for the same reason `NOT_FOUND` hides it (`SECURITY.md` §3).

---

## 10. Account

| Method | Path | Notes |
|---|---|---|
| PATCH | `/account` | Name, locale, calendar |
| POST | `/account/email` | Change email; re-verification required |
| POST | `/account/password` | Revokes other sessions |
| GET | `/account/export` | Full JSON export |
| DELETE | `/account` | Requires password; multi-step |

`GET /account/export` returns a streaming archive of everything the caller owns — people, relationships, stories, media metadata, events, places — in a documented, versioned format. Export must be a durable guarantee, not an undocumented convenience (spec §87), so the shape is versioned from the first release and covered by a test that exports a fixture family and re-reads it.

---

## 11. Endpoint summary by area

```
/auth              register, login, logout, session, verify, reset, sessions
/families          CRUD, dashboard, members, invitations
/people            CRUD, history, relatives, ancestry, descendants, claim
/relationships     CRUD, grouped relatives
/tree              subgraph, stats
/media             upload-slot, confirm, gallery, signed url, tag
/stories           CRUD, publish
/search            cross-type
/activity          feed
/notifications     list, read
/account           profile, email, password, export, delete
```

V1 adds `/events`, `/timeline`, `/places`, `/documents`, `/audio`, `/relationship-finder`, `/feed`, `/notifications/preferences`, `/import/gedcom`, `/export/gedcom`.

---

## 12. CSRF

State-changing requests must present **both** the session cookie and a matching `X-FamilyTree` header, which a cross-site caller cannot set without a successful CORS preflight. Combined with `SameSite=Lax` cookies and a same-origin `Origin` check, a cross-site forged request is rejected. Applied to every non-`GET`, including media confirmation.

---

## 13. Errors as designed, not accidents

- Validation returns per-field messages a form can render inline.
- Conflicts return the current server state so the UI can offer "keep mine / keep theirs", not just an error.
- Permission errors distinguish "you cannot do this" (actionable) from "this does not exist" (deliberately non-actionable).
- Transient failures are distinguishable so the client can retry rather than asking the user to do anything.

Every error carries a `requestId` that maps to exactly one server log line. Without that, a bug report from a non-technical user is unactionable — which for a product whose users are explicitly non-technical would be a design failure.
