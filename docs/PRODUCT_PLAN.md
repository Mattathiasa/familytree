# FamilyTree — Product Plan

> Source brief: `PRODUCT_SPEC.md`. This document records **decisions and scope**, with rationale.
> Companion docs: `ARCHITECTURE.md`, `DATABASE.md`, `UI_UX.md`, `API.md`, `SECURITY.md`, `TESTING.md`, `ROADMAP.md`.

**Status:** Phase 0 complete — planning. No production code written yet.
**Last updated:** 2026-09-30

---

## 1. Repository assessment

The product is **greenfield**. There is no existing FamilyTree repository, and per spec §3 this product is standalone and must not be coupled to any other application in this workspace.

What that means concretely:

| Question | Answer |
|---|---|
| Existing framework | None — new project |
| Existing language | None — choosing TypeScript end to end |
| Existing database | None — choosing PostgreSQL |
| Existing auth | None — building session auth |
| Existing components | None — building a design system |
| Existing tests | None — standing up Vitest + Playwright |

There is therefore **no working code to preserve and no architecture to replace.** The spec's "do not destroy working code" instruction is satisfied vacuously. The real risk in a greenfield build of this size is the opposite one: scaffolding everything at once, producing a large surface with nothing proven. That is why the phase plan in `ROADMAP.md` is gated on working, tested increments rather than on file completion.

**Environment note:** this project is currently being built in a temp working directory because the sandbox denied writes to `/Users/mattathiasa/Projects`. It must be moved to `/Users/mattathiasi/Projects/familytree` before anything is committed or deployed. See "Operational risks" below.

---

## 2. Product vision

> **A digital home where families can preserve, explore, and pass down their history across generations.**

The product succeeds when a relative who was never told a story can find it, and when a person who has already passed is remembered accurately.

Three commitments follow from that vision, and they drive most decisions below:

1. **The family tree is the spine, not a decoration.** It is the one view that is unique to this product and the reason people return. It gets the most engineering attention and the best empty state.
2. **Accuracy outranks completeness.** Forcing a birth year or a mandatory field produces confident falsehoods, which destroys the trust the archive depends on. Every field is optional; every date carries its own precision and confidence.
3. **The archive outlives the tool.** Data must be exportable and losslessly re-importable. A family that cannot leave is a family that cannot commit.

---

## 3. Target users

| User | What they actually need | Design consequence |
|---|---|---|
| **Grandparent** | Tell a story, be recorded, see themselves honoured | Voice-first capture; large targets; high contrast; no jargon |
| **Parent** | Preserve parents' and children's history | Onboarding that adds parents fast; date capture matters most here |
| **Family historian** | Resolve dates, verify claims, cite sources | Sources, confidence, edit history, GEDCOM import/export |
| **Younger generation** | Discover who they are | Relationship finder, timeline, shareable profiles |
| **Extended family** | Contribute without breaking things | Contributor role, suggestions instead of silent overwrites |
| **Individual** | A private record of their own family | No forced collaboration; solo use fully supported |

Two of these pull in opposite directions. The historian wants every field, a sources panel, and a diff view. The grandparent wants a record button and nothing else. **Resolution:** the UI is opinionated and small by default; advanced fields and evidence affordances are progressively disclosed. The data model keeps the full fidelity either way, so hiding a field never means discarding it.

---

## 4. User problems

1. Family history lives in one person's head and dies with them.
2. Physical photos and documents decay, get lost, or flood in a box nobody opens.
3. Existing genealogy software is intimidating, slow, and was designed for researchers, not families.
4. Relatives disagree about dates, and the software silently picks a winner, destroying trust.
5. Younger members have no reason to open a family archive because nothing in it addresses them.
6. There is no safe way to share family data publicly, so families share nothing.

Problems 4 and 6 are the ones most products get wrong. They are treated as **correctness requirements**, not features: a disagreement must be representable (§7, conflict handling), and privacy must be enforceable server-side (§6, and `SECURITY.md`).

---

## 5. User journeys

### Journey A — First-time user (the critical path)

```
Landing → Create account → Verify email
  → Create family (name, optional photo)
  → Add yourself (fewest possible fields)
  → Add a parent (suggested, skippable)
  → Empty tree state → "Your family story starts here"
  → First person added → tree renders with 2 nodes
  → Invite a relative
  → (return later) Dashboard shows activity + upcoming birthdays
```

Success is defined as reaching the **first rendered tree** quickly. Everything after that is enrichment. Onboarding is explicitly non-blocking (spec §8): a user who knows only their own name and their mother's name should still finish setup in under two minutes and have something real on screen.

### Journey B — Grandparent records a story

```
Dashboard → Memories → Record audio (in-browser)
  → Attach: person, approximate date, place
  → Optional: family member is notified
  → Audio plays back with transcript (V1+, never blocking)
```

The original audio must always remain available even if transcription exists (spec §30). This is a hard requirement, not a nicety — if a transcript is wrong or absent, the recording is the source of truth.

### Journey C — Historian corrects a disputed date

```
Search "Abebe" → Open person → Birth year shows 1947
  → Propose correction: 1948, with source (certificate scan)
  → Status: "suggested" — original still shown
  → Owner/admin approves → change recorded in history with both values
```

Nobody's work is ever silently discarded (spec §48, §49).

### Journey D — Extended family member contributes safely

```
Receives invitation link → Accepts → Role: Contributor
  → Can add people, stories, photos
  → Cannot delete other people's records
  → Cannot change family privacy settings
  → Cannot see records marked private by others
```

---

## 6. Functional requirements — MVP

Scoped strictly to spec §81 plus the minimum needed to make the tree trustworthy.

**Authentication**
- FR-1 Register with email + password; password hashed with Argon2id, never stored or logged in plaintext.
- FR-2 Verify email before family creation is meaningful.
- FR-3 Log in / log out with server-side sessions in `httpOnly`, `Secure`, `SameSite` cookies.
- FR-4 Password reset via single-use, expiring, hashed token.
- FR-5 Session listing and revocation (a stolen session can be killed).

**Family**
- FR-10 Create a family; creator becomes Owner.
- FR-11 Edit family name, description, photo, default calendar, visibility.
- FR-12 Family dashboard: counts, recent activity, upcoming birthdays/anniversaries.
- FR-13 Invite by email link or code; invite is inert until accepted; expires; revocable.
- FR-14 Roles: Owner, Admin, Contributor, Viewer (historian deferred).

**People**
- FR-20 Add a person with only a name required.
- FR-21 Edit any permitted field; every field optional.
- FR-22 Person profile: photo, lifespan, biography, relatives, linked content.
- FR-23 Person is distinct from a user account (§16). A historical person has no account. A living member may later claim their profile.
- FR-24 Soft delete with a recoverable state.

**Relationships**
- FR-30 Relationships are edges in a graph, never columns on a person.
- FR-31 Types: parent/child, spouse, sibling, plus qualifying metadata (biological, adoptive, step, legal, unknown).
- FR-32 Support multiple spouses, half-siblings, step-relations, adoptive relations.
- FR-33 Creating a cycle in the ancestor graph is rejected (a person cannot become their own grandparent).
- FR-34 A relationship may itself carry privacy and provenance.

**Tree**
- FR-40 Interactive tree: pan, zoom, fit-to-screen, centre, expand/collapse branches.
- FR-45 Select, search, jump-to-person, highlight a branch or a relationship path.
- FR-46 Large-graph behaviour: server-side subgraph fetch, viewport culling, incremental render. Target 1,000 people without freezing the UI.
- FR-47 Works with pointer, keyboard, and touch.
- FR-48 Degrades to a usable list if WebGL/canvas is unavailable or motion is reduced.

**Memories**
- FR-50 Photo upload to object storage with server-side type sniffing and size limits.
- FR-51 Gallery (grid) and albums; captions, dates, people, events, places.
- FR-52 Media is private by default; served via short-lived signed URLs.

**Stories**
- FR-60 Create, edit, publish, delete a story with title, body, people, date, place, attachments.
- FR-61 Drafts are private to the author until published.

**Privacy**
- FR-70 Visibility per record: private / family / selected / public.
- FR-71 Enforced on the server for every read and write. The client never decides access.
- FR-72 Living people default to restricted visibility for exact dates, contact details, and private notes.

### Explicitly not in MVP

Audio/video documents, events, timeline, places, relationship finder, activity feed, notifications, branches, GEDCOM, map, family book, recipes, traditions, AI features, comments. These are V1+ per `ROADMAP.md`. They are deferred so the core loop — *build a tree, see it, trust it* — ships first and is proven.

---

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Tree interaction | Pan/zoom 60fps at 300 visible nodes; first paint < 1.5s on a mid-range phone |
| NFR-2 | Large family | 1,000 people: profile and search stay under 300ms server-side |
| NFR-3 | Page load | LCP < 2.5s on 4G; app shell under 150KB gzipped |
| NFR-4 | Accessibility | WCAG 2.1 AA: full keyboard operability, screen-reader tree, 4.5:1 contrast, 200% zoom, 44px targets |
| NFR-5 | Uploads | 10MB image, 500MB video; resumable for video |
| NFR-6 | Data durability | Point-in-time DB recovery; media versioned; export tested quarterly |
| NFR-7 | Privacy | No record readable without a server-side permission check; verified by test, not review |
| NFR-8 | Slow networks | Optimistic UI for edits; explicit upload progress; drafts survive a dropped connection |
| NFR-9 | Localisation | No hardcoded user-facing strings; Amharic (English fallback) from day one |
| NFR-10 | Calendars | Every date stored with calendar system + precision; Ethiopian and Gregorian from the start |
| NFR-11 | Uptime | 99.5% target, appropriate for a private family archive rather than a payments product |

---

## 8. MVP definition

The MVP is complete when a new user can do the following **without help**, end to end:

> Create account → create family → add themselves → add a parent → link them → **see a two-node tree** → open a profile → add a story → upload a photo → invite a relative who accepts and can add a person → control visibility on one record.

That is a vertical slice through auth, permissions, the graph, rendering, media, and collaboration. Everything else in the spec is V1+.

**Explicit MVP boundaries.** Not included: multiple tree layouts, audio, video, documents, events, timeline, places, relationship finder, feed, notifications, branches, import/export, map, i18n UI strings (architecture only, English UI), historian role, suggestions/conflict UI (data model and audit log only — plain edit history ships).

---

## 9. V1 scope

Audio memories (record + upload + playback), video, documents, events with precision dates, chronological timeline, places with reuse/deduplication, relationship finder, activity feed, notifications, per-record ACL, branches as views, family search across content types, Ethiopian calendar in the UI, Amharic UI, suggestions + approval workflow, GEDCOM export.

## 10. Future roadmap

AI-assisted transcription and OCR, GEDCOM import, family map, printable family book, recipes and traditions, advanced kinship analysis, oral-history archive. Per spec §83, **the core application must work fully without any AI feature**; AI is assistive, never a dependency.

---

## 11. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R-1 | **Living-person privacy leak** | Severe — real-world harm to users | Server-side enforcement; privacy-by-default; a test that asserts a Viewer cannot fetch a private record by guessing its id |
| R-2 | **Tree performance collapses** at several hundred people | Core feature unusable | Pure layout module decoupled from DOM; viewport culling; a 1,000-person synthetic benchmark in CI |
| R-3 | **Cycle/corrupt data** from user edits | Tree won't render, data misleading | Server rejects ancestor cycles; DB constraints; integration tests with pathological graphs |
| R-4 | **Conflicting data destroys trust** | Users stop contributing | Edit history from day one; suggestions in V1; never silently overwrite |
| R-5 | **Scope explosion** — 21 areas × many features | Nothing ships | Phase gates; MVP boundary in §8 is binding; new features require removing something |
| R-6 | **Media cost/hosting** | Unit economics break for large archives | Tiered limits, lifecycle rules, signed URLs, no video transcode in MVP |
| R-7 | **Onboarding too slow** — empty tree feels broken | High drop-off | Non-blocking onboarding; first tree reachable in < 2 min; designed empty state |
| R-8 | **Older users excluded** by a modern-only interface | Loses the exact demographic most motivated | Large targets, contrast, keyboard access; older users named in the test plan |
| R-9 | **Date/calendar modelling done wrong** | Expensive to fix later; corrupts history | Structured date type + calendar system from the first migration; Ethiopic conversion tested |
| R-10 | **Wrong data model** for genealogy | Rewrites the core | Person/relationship/place separation per §16, §34, §69; avoid nullable denormalisation |
| R-11 | **Operational:** project cannot be written to its intended path in this environment | Work is stranded in temp storage | **Resolved 2026-09-30** — the project lives at `/Users/mattathiasa/Projects/familytree` |

### Operational risk (R-11, current)

Writes to `/Users/mattathiasi/Projects` are currently denied by the environment. The project is being built at
`/var/folders/jt/0gpmhbt103b1jsz27091byt40000gn/T/kilo/familytree`, which is temporary and **must not be treated as a home for the work.** First action once access is restored: move the directory, then re-verify the build. Nothing is committed yet, so the move is lossless.

---

## 12. Technical assumptions

1. **PostgreSQL is available** (local via Docker, managed in production). The data model is relational by nature — see `DATABASE.md` §1.
2. **S3-compatible object storage is available** for media. Direct-to-storage uploads via short-lived presigned URLs; the API never proxies large files.
3. **Transactional email** (verification, reset, invitations) is available via an API.
4. **A single region** initially. Multi-region is out of scope for MVP; the design does not preclude it.
5. **TypeScript end to end** — the domain logic (relationships, dates, permissions) is shared between server and client, so one language means one implementation of the rules that must not diverge.
6. **English UI for MVP**, with all strings externalised from day one so Amharic is a translation file, not a refactor (spec §56).
7. **No facial recognition, ever, in MVP** (spec §27). Manual tagging only.
