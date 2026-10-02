# FamilyTree — Roadmap

> Companion: `PRODUCT_PLAN.md` (scope), `ARCHITECTURE.md`, `TESTING.md`.
> Phases follow the structure the spec sets out (spec §91); the **gates** and **exit criteria** are the engineering addition.

---

## 1. How phases are gated

A phase is done when its exit criteria pass — not when its files exist. The full criteria are in `TESTING.md` §11.

Two rules keep this from becoming a 21-feature sprawl:

1. **A phase must be demonstrable.** Someone can use the product at the end of it. No phase ends with infrastructure that only a later phase can use.
2. **A new feature must displace something.** If V1 grows, MVP does not silently grow with it.

---

## 2. Status

| Phase | Scope | Status |
|---|---|---|
| 0 | Discovery, planning, documentation | **Complete** |
| 1 | Foundation: structure, design system, DB, auth | **In progress** — monorepo, design system, and `packages/domain` (dates, calendars, names, permissions, cycle check) are built and tested; DB and live auth are next |
| 2–4 | Family, people, relationships domain | **Frontend complete** on the mock API seam (`apps/web/src/api/client.ts` mirrors `API.md`); server-side pending |
| 5 | Family Tree | **Frontend complete** — pure layout engine + pan/zoom canvas + ARIA/keyboard + list fallback, golden-tested; server subgraph contract pending |
| 6–13 | See below | Not started |

**Implementation note (2026-09-30):** the UI milestone was built against a mock data layer
so the design, tree engine, and domain rules could be proven before choosing a database host.
Supabase Postgres is the planned store; wiring it in is a transport swap behind `apps/web/src/api/client.ts`.

**Phases 0 deliverables:** `PRODUCT_SPEC.md` (the brief, as given), `PRODUCT_PLAN.md`, `ARCHITECTURE.md`, `DATABASE.md`, `UI_UX.md`, `API.md`, `SECURITY.md`, `TESTING.md`, `ROADMAP.md`.

---

## 3. Phase plan

### Phase 1 — Foundation
**Build:** npm workspace scaffolding; TS config; Postgres + Drizzle schema and migrations; `packages/domain` (dates, display names, permission predicates) with exhaustive unit tests; design tokens and core primitives; auth (register, verify, login, logout, reset, sessions); Express app with the fixed middleware order; error contract; CI running lint, typecheck, unit, integration.

**Exit criteria:** migrations apply and roll back cleanly; register → verify → login → session works against a real database; 100% branch coverage on `domain`; axe passes on the login and register screens.

**Explicitly not here:** tree, people, media. Auth is the only vertical slice, because it establishes the tenancy, permission, and error patterns everything else reuses.

---

### Phase 2 — Family
**Build:** family create/edit; membership and roles; invitations (accept, reject, revoke, expire); family settings; dashboard shell with stats.

**Exit:** owner creates a family, invites a Viewer, Viewer accepts and sees an empty family; Viewer is refused `/settings` by direct URL.

---

### Phase 3 — People
**Build:** person CRUD with optional fields; the precision-aware date field; place typeahead with reuse; person profile; soft delete and restore; change-record audit.

**Exit:** a person with only a name, then progressively enriched; every field optional at every step; history shows who changed what.

---

### Phase 4 — Relationships
**Build:** the relationship graph; parent/child, spouse, sibling; multiple spouses, adoption, step, half-sibling; cycle rejection; the derived sibling view; the kinship domain service with exhaustive tests.

**Exit:** the complicated-family fixture passes the kinship suite; a cycle attempt is refused; siblings derive correctly from parents.

---

### Phase 5 — Family Tree
**Build:** pure layout engine; incremental expansion; viewport culling; pan/zoom controller; node interactions; search-to-highlight; relationship-path highlighting; the ARIA tree and keyboard model; the non-canvas list fallback.

**Exit:** 1,000-person benchmark within budget; the full journey is completable by keyboard alone; reduced motion and no-canvas paths both work.

---

### Phase 6 — Memories
**Build:** three-step upload with presigned URLs; byte sniffing; gallery; albums; manual people-tagging; signed-URL reads; orphan sweep.

**Exit:** a mislabelled file is rejected; a revoked user's signed URL stops working; per-file progress with retry.

---

### Phase 7 — Stories
**Build:** story CRUD; the focused editor; people/place/date association; drafts; publish; local draft persistence.

**Exit:** a draft is invisible to another member regardless of its visibility; a dropped connection loses no draft.

---

### Phase 8 — Events & Timeline
**Build:** events with precision dates; the chronological timeline; birthdays; anniversaries; the daily reminder worker; per-user reminder preferences.

**Exit:** reminders respect visibility; a user can disable any reminder; recurring events generate without row explosion.

---

### Phase 9 — Collaboration
**Build:** activity feed; notifications; mentions; the suggestions-and-approval workflow; per-record ACLs (`selected` visibility); contribution history.

**Exit:** a suggestion never overwrites the original; the feed leaks no private activity.

---

### Phase 10 — Advanced Family History
**Build:** places with map; documents; audio recording, upload, playback; video; relationship finder; GEDCOM export.

**Exit:** audio plays with no transcript present (spec §30); the relationship finder computes from the graph with no hardcoded answers; a GEDCOM export round-trips.

---

### Phase 11 — Polish
**Build:** accessibility remediation; performance work against the recorded baselines; responsive refinement for all three breakpoints; every empty/loading/error state; localisation catalogue structure with Amharic strings.

**Exit:** zero axe violations; manual screen-reader passes complete; all NFR budgets met; a real older-user walkthrough shows no hesitation.

---

### Phase 12 — Testing
**Build:** the remaining E2E journeys; the full security suite from `SECURITY.md` §11; cross-browser and real-device passes; the restored 1,000-person performance baseline.

**Exit:** every security test passes; E2E covers the complete critical journey; restore-from-backup rehearsed successfully.

---

### Phase 13 — Production
**Build:** deployment pipeline; staging parity; database rules and storage rules review; monitoring and alerting; backup with a rehearsed restore; privacy policy and terms; support runbook.

**Exit:** a staging deploy reproduces production; alerts fire in a drill; a full restore from backup succeeds; an independent security review is complete.

---

## 4. Milestones

Deliberately expressed as capability milestones rather than dates. Dates on a product of this scope would be fiction; the **gates** are what actually control progress.

| Milestone | Reached when | Value delivered |
|---|---|---|
| **M1 — Foundation** | Phase 1 | Working auth, real database, design system |
| **M2 — A family exists** | Phase 3 | People can be recorded and read |
| **M3 — The tree works** | Phase 5 | The centrepiece, at scale, accessible |
| **M4 — The archive** | Phase 7 | Photos and stories |
| **M5 — The family builds it** | Phase 9 | Collaboration, history, conflict safety |
| **M6 — A real family history** | Phase 10 | Audio, documents, places, kinship |
| **M7 — Production** | Phase 13 | Safe to invite a real family |

**The product is genuinely useful at M3.** Everything after that deepens an already working archive. That ordering is the main risk mitigation in the plan: if we stop after M3, a family still has a working, private, accessible family tree with photos and stories.

---

## 5. Risks to the plan

| Risk | Effect on phases | Mitigation |
|---|---|---|
| Scope explosion | Phases 8–13 drift indefinitely | MVP boundary in `PRODUCT_PLAN.md` §8 is binding; V1 additions require an explicit trade |
| Tree performance | Phase 5 overruns badly | Pure layout module, benchmark in CI from Phase 1, synthetic 1,000-person fixture built early |
| Kinship correctness | Phase 4 and 10 | Pure domain module, pathological fixtures, exhaustive unit tests before any UI |
| Privacy leak | Any phase, catastrophic | Two enforcement layers, 12 release-gating tests, RLS backstop |
| Media cost | Phase 6+ | Quotas, lifecycle rules, no transcode in MVP; measured before scaling |
| No one uses it past the tree | Everything after Phase 5 | M3 is a shippable product; later phases are earned by observed demand |
| Operational (project not yet in its home directory) | **Current** | Move to `/Users/mattathiasi/Projects/familytree` before the first commit — see `PRODUCT_PLAN.md` R-11 |

---

## 6. Explicitly deferred

Named here so deferral is a decision on record rather than an omission.

- **Facial recognition** — never, in any phase (spec §27).
- **Native mobile apps** — no evidence of need; a PWA covers much of it.
- **Real-time collaboration** (live cursors, presence) — the conflict model is review-based, which suits relatives contributing at different times.
- **Public shared pages** — a real need, and a real privacy surface. Deferred; the schema supports it at no cost.
- **AI features** — assistive only. The core product must work fully without them (spec §83).
- **Multi-region** — one region initially; the design does not preclude it.
- **Offline tree editing** — the highest-risk feature in the brief, and the one most likely to cause silent data loss. Draft-only offline in V1 (`ARCHITECTURE.md` §13).
