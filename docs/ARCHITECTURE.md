# FamilyTree — Technical Architecture

> Companion to `PRODUCT_PLAN.md` (scope), `DATABASE.md` (schema), `SECURITY.md` (threat model), `API.md` (contracts).
> **Status:** frontend implemented (M3 scope); backend pending. The web app runs against a mock
> data layer shaped exactly like the `API.md` contracts (`apps/web/src/api/client.ts`), so adding
> the Express + Postgres backend is a transport swap, not a rewrite. Database host decision:
> **Supabase Postgres** (managed, direct connection string for Drizzle; Supabase Auth SDK is *not*
> used — session auth stays in our own tables per §4.1). Every choice below states its alternative and why it lost.

---

## 1. Stack decision

| Layer | Choice | Rejected alternative | Why |
|---|---|---|---|
| Language | **TypeScript** (strict) everywhere | Mixed JS/TS | The kinship, date, and permission rules must be identical on both sides of the wire. One language, one implementation, no drift. |
| Frontend | **React 19 + Vite** | Vanilla JS | 21 product areas, a design system, i18n, a rich-text editor, and an interactive graph. A 21-screen app without a component model becomes unmaintainable duplication, which spec §92 Rule 2 forbids. |
| Backend | **Node 22 LTS + Express 5** | Fastify, Next.js API | Express is the least surprising choice and the team already knows it. A server-rendered Next app would fight the SPA nature of the tree. Fastify's edge is throughput we do not need yet. |
| Database | **PostgreSQL 16** | Firestore/MongoDB | Genealogy is a graph of typed edges with heavy relational queries — ancestry traversal, "children of", conflict transactions. Recursive CTEs solve this directly. A document store makes every one of those a hand-rolled aggregation. See `DATABASE.md` §1. |
| ORM | **Drizzle** | Prisma, raw SQL | Type-safe with SQL escape hatches. Recursive CTEs and window functions are first-class here; Prisma would force raw SQL for exactly the queries the product is built on. |
| Migrations | **Drizzle Kit** (versioned SQL in `migrations/`) | Hand-run SQL | Reviewable, revertible, applied in order, and testable against a throwaway database in CI. |
| Auth | **Own session auth**, Argon2id | Firebase Auth, Auth0, Clerk | Family history is unusually sensitive, and a family must remain able to export and leave. Self-hosted sessions keep auth data in our database under our rules, and cost nothing per MAU. |
| Media | **S3-compatible object storage**, private buckets, presigned uploads | Store binaries in Postgres, or a media SaaS | Spec §65 forbids large binaries in the DB. Presigned direct upload means large files never traverse the API, so API memory and bandwidth stay flat. |
| Search | **Postgres full-text (`tsvector`) + `pg_trgm`** | Elasticsearch/Meilisearch from day one | Spec §71 explicitly says start simple. Postgres covers MVP search and leaves a clean seam to add a dedicated engine when measurement demands it. |
| Monorepo | **npm workspaces** | Separate repos, single package | Domain logic must be shared and version-locked with both apps. Workspaces give that without publishing. |
| Tests | **Vitest** (unit/integration) + **Playwright** (E2E) | Jest, Cypress | Vitest shares the TS/ESM config; Playwright has the better accessibility and trace story for a product that must be usable by older users. |

**Cost discipline:** every dependency added must justify itself. The initial set is deliberately small — no component library (the design system is ours, per spec §59/§60), no ORM-adjacent magic, no state library beyond React's own.

---

## 2. Repository layout

npm workspaces monorepo.

```
familytree/
├── apps/
│   ├── api/                  Express API
│   │   └── src/
│   │       ├── server.ts     app wiring, middleware order
│   │       ├── config.ts     env parsing, fail-fast
│   │       ├── routes/       thin HTTP adapters
│   │       ├── services/     use cases, transaction boundaries
│   │       ├── domain/       pure logic: kinship, dates, permissions
│   │       ├── repos/        SQL access only
│   │       └── middleware/   auth, csrf, errors, rate limit
│   ├── web/                  React SPA
│   │   └── src/
│   │       ├── app/          router, providers, layout
│   │       ├── features/     vertical slices (tree, people, stories…)
│   │       ├── components/   shared design-system primitives
│   │       ├── tree/         layout engine (pure) + renderer + hooks
│   │       ├── api/          typed client, generated types
│   │       ├── styles/       tokens, global styles
│   │       └── i18n/         message catalogues
│   └── worker/               async: thumbnails, digests, reminders
├── packages/
│   ├── domain/               shared pure logic (no IO) — the crown jewels
│   ├── db/                   schema, migrations, seed
│   ├── ui/                   design system + tokens
│   └── config/               shared tsconfig/eslint
├── docs/
├── infra/                    docker-compose, deploy config
└── tests/e2e/
```

**The `packages/domain` boundary is the important one.** Kinship computation, calendar conversion, permission predicates, and date precision live there, import nothing, and are unit-tested exhaustively. Both apps depend on it; it depends on nothing. If the server and client ever disagree about who may see a record, that is a bug in one place and fixable in one place.

---

## 3. Backend architecture

Layered, and the dependency direction is strictly inward:

```
routes/      HTTP only: parse, validate, call a service, shape the response
   ↓
services/    use cases + transaction boundaries; orchestrate repos
   ↓
repos/       SQL and nothing else; no business rules
   ↓
Postgres
```

`domain/` sits beside `services/` and is imported by both; it never imports `services/`.

- **Validation** at the route boundary with a schema (Zod), producing a typed, narrowed request. Invalid input never reaches a service.
- **Transactions** at the service boundary. A person and their relationships are written atomically — a half-created person is a corrupt tree.
- **Errors** are a small typed hierarchy (`ValidationError`, `NotFoundError`, `ForbiddenError`, `ConflictError`, `RateLimitedError`) mapped to a single HTTP error shape by one middleware. Services never touch `res`.
- **Ids** are UUIDv7 — time-ordered, so index locality and pagination stay good, and they leak no sequential information.

### 3.1 Request pipeline

Order matters and is fixed in `server.ts`:

1. `helmet` — security headers, CSP
2. CORS (allowlist, never `*` with credentials)
3. request id → structured log
4. body parser with a hard size cap
5. rate limit (auth endpoints stricter)
6. session load
7. route
8. error handler (single place that formats errors)

---

## 4. Authentication and authorization

### 4.1 Authentication

- Argon2id (memory-hard) for password hashing. Parameters stored per-hash so they can be raised later without invalidating existing users.
- Sessions are **server-side** rows; the cookie carries only an opaque random token. `httpOnly`, `Secure`, `SameSite=Lax`, `__Host-` prefix, `Path=/`.
- Every session records user agent, IP, created/last-seen, and expiry. Users can list and revoke sessions (spec §6) — a stolen session must be killable.
- Email verification and password reset use single-use, hashed, expiring tokens. Reset tokens are invalidated on use and on password change.
- On privilege change (password reset, email change, account deletion) all other sessions are revoked.

**Why server-side sessions and not JWT:** revocation. A family-history product is long-lived and shared across devices; a JWT that cannot be revoked before expiry is a real risk, and session listing is explicitly required by the spec.

### 4.2 Authorization

Two layers, both server-side. Neither trusts the client.

**Role** (family-scoped): `owner` > `admin` > `contributor` > `viewer`. Stored on `family_members`. A user may hold different roles in different families and may own several.

**Record visibility** (per record): `private` | `family` | `selected` | `public`.

Every record in a family carries a `family_id` — this is the tenancy boundary, and **every query is scoped by it.** No query may reach a record without a resolved `family_id`; that is enforced by a repository-layer guard, not by remembering to add a `WHERE` clause.

Permission is a pure function in `packages/domain`:

```
can(action, actor, resource) → boolean | 'needs-approval'
```

Because it is pure and shared, the client can use it to *hide* what the user cannot do, while the server uses the same code to *enforce* it. The client copy is a convenience, never a control.

Privacy defaults favour privacy (spec §20): new records default to `family`; records about **living people** default to `restricted` for exact dates, contact details, and private notes, and are only widened by an explicit action that is itself audited.

---

## 5. File storage

```
Client ──1. request upload slot──► API
         (validates permission, sniffs bytes, allocates key)
Client ──2. PUT bytes direct───► Object storage (presigned, 15 min, one key)
Client ──3. confirm────────────► API
         (re-sniffs stored object, creates media row, queues thumbnails)
Client ──4. GET media──────────► API authorizes ──► short-lived signed GET URL
```

- Buckets are **private**. Nothing is ever public-by-URL. Access is a signed URL minted only after an authorization check, with a TTL in minutes.
- **The API never proxies media bytes.** It validates, records, and signs.
- Upload validation is **byte sniffing**, not the client-declared MIME type or extension (the failure mode exploited in the previous project in this workspace is worth naming explicitly). A file that sniffs as executable or as a type outside its declared category is rejected.
- Size and type ceilings per category, enforced in `packages/domain` so the client and server agree, with the server authoritative.
- Orphaned uploads (slot allocated, bytes never arrived) are swept after 24h by the worker.

---

## 6. Tree visualization

The single most technically demanding piece, and the one users judge the product by.

**Layer 1 — layout, pure and headless.** A deterministic layout function maps a subgraph to positioned nodes and edges. It imports no DOM and no React. This is what makes it testable (golden positions, no browser) and reusable across the web app, a future server-side book generator, and a future native client.

Two layouts ship:
- `descendant` — the traditional tree, a person with spouses and children below, generations as rows.
- `ancestor` — a person with parents above, for "where did we come from".

Layout must be **incremental**: expanding one branch re-runs layout for that subtree and reuses cached positions for everything else. Re-laying out 1,000 nodes on every expand is what makes naive implementations stutter.

**Layer 2 — rendering.** React renders only nodes inside the viewport, culled against a spatial index. Pan and zoom are a single CSS transform on the canvas element, so they never trigger React re-renders. Nodes are absolutely positioned within a known-size canvas.

**Layer 3 — interaction.** A small controller owns pan/zoom/selection state outside React's render path and publishes to React only on meaningful change (selected person, hovered node) via a subscription. This keeps the render cost proportional to *what changed*, not to the size of the tree.

**Degradation (spec §48, §57):**
- `prefers-reduced-motion` → no animated transitions, instant layout changes.
- No WebGL / canvas → the same subgraph renders as an accessible, keyboard-navigable nested list. The tree is never the *only* way to see relationships; the person list and profile cross-links are full peers.
- Keyboard: arrow keys traverse, Enter opens a profile, Space selects, Escape clears. The tree exposes a real ARIA tree structure with `aria-level`, `aria-expanded`, and a live region announcing selection.

**Why not an off-the-shelf graph library:** the libraries we would consider (React Flow, Cytoscape, D3-hierarchy) each own their layout or their interaction model, and we need all three of custom incremental layout, viewport culling, and full keyboard/AT support. Adopting one means fighting it on the two hardest requirements. The layout is ~400 lines of pure TypeScript; owning it is cheaper than bending a library.

**Server contract:** the tree is fetched as a *subgraph* — `GET /families/:id/tree?root=<personId>&depth=N&direction=descendant|ancestor`. It never returns the whole family by default. Depth is capped, and `hasMore` tells the client which branches can be expanded.

---

## 7. Search

**MVP:** Postgres. `tsvector` generated columns with GIN indexes for full-text on people, stories, events, and places; `pg_trgm` GIN indexes for substring and typo-tolerant name search (essential — people type "Abebe" and misspell it). Results are always filtered by `family_id` and by the caller's visibility, using the same predicates as normal reads. A search result must never reveal a record the user could not have opened.

**Seam:** search is behind a `SearchProvider` interface with one Postgres implementation. When volume or quality demands it, a Meilisearch or Typesense implementation is added and the index is fed from an outbox table. The swap is local to one module; no caller changes.

---

## 8. Notifications

In-app notifications are rows, read via a simple unread count. Delivery is at-least-once and **never on the critical path**: recording an action writes a notification row in the same transaction as the action, and a worker performs email delivery with retries and a dead-letter queue.

Birthdays and anniversaries are computed by a daily worker job, not per request. Two constraints from the spec: exact dates are only surfaced to users permitted to see them, and users can disable any reminder (spec §41, §42).

---

## 9. Caching

Three layers, each earning its place:
1. **HTTP** — `ETag` on read endpoints, `Cache-Control: private, no-store` on anything permission-dependent. Private, never shared, because a family archive must not sit in a shared cache.
2. **Query** — a small in-process LRU for hot, expensive graph reads (ancestry of a person), scoped to the requester so it can never leak across users.
3. **CDN** — only the hashed, unauthenticated app shell. Never family data.

Media thumbnails are immutable and content-addressed, so they are the one thing cached aggressively.

---

## 10. Performance strategy

- Server-side subgraph fetching for trees; the client never holds the whole graph.
- Viewport culling and incremental layout (see §6).
- Keyset pagination, never `OFFSET`, for lists — `OFFSET` degrades linearly and gets worse exactly when a family is large.
- Covering indexes for the queries the app actually runs, written down in `DATABASE.md` §6 rather than scattered.
- Images resized and served as derivatives on upload, in a background worker.
- The app shell is code-split per route; the tree renderer is loaded lazily because most sessions never open it.

**A synthetic benchmark is part of CI** (risk R-2): 1,000 people, three spouse edges, seven generations. Layout time and render frame time are asserted against budget, so a performance regression fails the build instead of being noticed by a user.

---

## 11. Deployment

| Environment | Composition |
|---|---|
| Local | `docker-compose`: Postgres 16, MinIO (S3-compatible), Mailpit (catches email locally) |
| Preview | Per-branch; ephemeral Postgres from a migration dump; object storage in a preview bucket |
| Production | API (Node container) + Postgres (managed, PITR) + object storage (versioned) + worker. CDN in front of static assets only |

- Migrations run as a separate gated step before the new version serves traffic, never on boot.
- Blue/green or rolling deploys; the API is stateless — all session state is in Postgres, so instances are interchangeable and horizontally scalable.
- Secrets only from environment. No secret ever enters the image, the repository, or a log line.
- Backups: continuous WAL archiving plus daily snapshots, with **restore rehearsed** quarterly. A backup that has never been restored is a hypothesis, not a backup.

---

## 12. Observability

Structured JSON logs with a request id, containing no family content and no personal data by default. Error tracking with source maps. Real metrics that map to the NFRs: API latency percentiles, auth failure rate, upload success/failure, tree layout duration, DB connection pool saturation. Alerts on error rate, p95 latency, and pool exhaustion.

**Privacy constraint:** the product holds intimate family data. Analytics is aggregate and first-party only. We do not instrument user content, we do not record sessions containing personal data, and we do not ship data to third-party analytics. (Spec §88, §89)

---

## 13. Offline / network resilience

**Decision: no full offline support in MVP; targeted offline support in V1.** Documented rather than deferred silently, per spec §73.

Rationale: multi-user, multi-device conflict resolution across an offline-capable graph editor is a project in itself, and getting it wrong produces silent data loss — the worst possible failure for an archive. The value is concentrated in a few narrow places:

- **Drafts** of stories and person edits persist locally and survive a dropped connection (highest value, lowest risk — single-user, single-record).
- **Recently viewed** people are readable offline.
- **Not** the tree, and not any multi-record edit.

The architecture does not preclude a service worker later; the draft layer is where it would start.

---

## 14. Internationalisation and calendars

- All user-facing strings live in message catalogues loaded by locale, with a typed key set so a missing translation is a **compile error**, not a runtime blank. English is the fallback; Amharic arrives in V1 as a catalogue, not a refactor.
- Dates are never strings. A structured date carries its calendar system and precision (spec §76, R-9). Conversion between Ethiopian and Gregorian happens in `packages/domain` with a property-based test over a wide range, because an off-by-one in that conversion would corrupt real history.
- Fonts must cover Ethiopic script; the design system sizes and line-heights are checked with Amharic text, not just Latin.
