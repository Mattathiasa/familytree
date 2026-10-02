# FamilyTree — Testing Strategy

> Companion: `SECURITY.md` §11 (the release-gating security tests), `PRODUCT_PLAN.md` NFRs (the budgets that must be measured).

---

## 1. Principles

1. **Test the domain, exhaustively.** Kinship, calendars, and permissions are pure functions with subtle rules. They get the densest tests in the project because they are where a wrong answer is invisible and consequential.
2. **Security tests are gates, not reports.** A failing test in `SECURITY.md` §11 blocks the release.
3. **Integration over mocks at boundaries.** Tests run against a real Postgres from a migration, not a fake. The recursive CTEs, partial indexes, RLS policies, and `check` constraints only exist in the real database — mocking them would test nothing that matters.
4. **Test the failure paths as carefully as the happy path.** Empty, offline, denied, conflicting, and malformed are the states users actually hit.
5. **Every bug becomes a test.** A regression that ships is a process failure, not bad luck.

---

## 2. Layers and targets

| Layer | Tool | Scope | Gate |
|---|---|---|---|
| Unit | Vitest | `packages/domain` pure logic | 100% branch coverage on `domain`, `services` |
| Integration | Vitest + real Postgres | Repos, services, routes, auth, RLS | All suites pass |
| Contract | Vitest | API request/response shapes vs Zod schemas | All pass |
| Component | Vitest + Testing Library | Design-system primitives, key components | All pass |
| E2E | Playwright | The critical user journeys | All pass |
| Accessibility | axe-core (in CI) + manual | Every screen | Zero serious/critical |
| Performance | Custom benchmark | Tree layout, API p95, render frames | Within NFR budget |
| Security | Vitest + Playwright | `SECURITY.md` §11 | Blocks release |

**Why Vitest with real Postgres rather than an in-memory fake:** the parts most likely to be wrong in this product are graph traversal, partial indexes, RLS, and composite-type constraints. Every one of those is a Postgres feature. An in-memory substitute would let the bugiest code pass the most tests.

---

## 3. Unit tests — the domain

### 3.1 Kinship

- Direct: parent, child, spouse, sibling.
- Transitive: grandparent, aunt, uncle, first cousin, grandchild, in-law, step-parent, half-sibling.
- Multiple spouses and children from several unions.
- Adoptive, step, foster, and unknown-nature relations.
- **Pathological graphs** (risk R-3): the same person as both ancestor and descendant; a marriage between second cousins; a long sibling chain; a person with no parents; a disconnected subgraph.
- **Disconnected people** — no relationship found, and the function returns "no known relationship" rather than a wrong one or an infinite loop.
- **Degenerate input** — a person who is their own parent, if the cycle guard is ever bypassed, must terminate rather than hang.

### 3.2 Calendar and date precision

- Ethiopian ↔ Gregorian round-trips across a wide range, including **leap years and the Ethiopic leap rule** (a real trap: 2011 EC, 2015 EC, 2019 EC, 2023 EC).
- Every precision renders correctly: exact, month-year, year, circa, range, unknown.
- **A single year never renders as a fake range.** "1948" is not "1948–1948".
- `circa` is never dropped in round-trips through storage or export.
- Invalid dates are rejected, not silently coerced: 31 February, month 13, day 0.
- Property-based testing over a large date range to catch conversion drift.

### 3.3 Permissions

A truth table over `{role} × {action} × {visibility} × {is_living} × {is_author}`, including `selected` ACLs. Every cell asserted. This table is the product's privacy guarantee, so it is tested exhaustively rather than by sampling.

### 3.4 Display-name derivation

Nickname preferred; surname-only; single name; Amharic patronymic patterns; all-empty. And the invariant that it is **derived, never stored** (`DATABASE.md` §4).

### 3.5 Upload validation

Declared type vs sniffed type vs extension, across a table of real files and crafted mismatches — including a PHP file named `.jpg`, a ZIP renamed `.png`, and a truncated JPEG.

---

## 4. Integration tests

Against a real database created by running the actual migrations.

- **Auth** — register, verify, login, logout, reset, session listing and revocation, and the guarantee that a revoked token stops working immediately.
- **Tenancy** — for every endpoint, family A's member cannot touch family B's data. Parameterised across the whole route table so a new endpoint is covered by default.
- **People and relationships** — create, edit, and the `version` conflict path; cycle rejection; cascade delete; soft-delete and restore.
- **Invitations** — accept, reject, revoke, expire, replay (a used token must fail), and the rule that an invite grants nothing before acceptance.
- **Media** — slot allocation, presigned-URL scope, confirm, a sniffing mismatch, size limits, and a signed URL that stops working after access is revoked.
- **Stories** — draft isolation (a draft is invisible to other members even when `visibility = 'family'`).
- **RLS** — a query run outside the repository layer still cannot cross a family boundary.
- **Audit** — every edit writes a change record, in the same transaction, with old and new values.

---

## 5. E2E — the critical journeys

The suite covers the MVP success criteria in `PRODUCT_PLAN.md` §8:

1. Register → verify → create family → add self → add parent → **see a two-node tree** → open profile → add story → upload photo → invite relative → they accept and can add a person → set visibility → verify the relative cannot see a private record.
2. Correct a date that someone else changed concurrently → conflict shown → user chooses → history records both values.
3. Soft delete a person → restore → relationship intact.
4. Upload rejection paths: wrong type, too large, interrupted upload.
5. Search finds a person; a private record never appears in results.
6. Relationship path highlighting works on a small tree.

**Personas, not just flows.** At least one journey is run as a **Viewer**, asserting the Manage section is absent and direct URL access to an admin route is refused — because UI hiding is not a control (`SECURITY.md` §3).

---

## 6. Accessibility tests

- **axe-core on every screen in CI.** Zero serious or critical violations. The automated pass catches roughly a third of real issues, so it is necessary and not sufficient.
- **Keyboard-only E2E**: complete the critical journey using only the keyboard. The tree must be fully traversable with arrows, Enter, and Escape.
- **Screen-reader manual passes** at Phase 11 across VoiceOver and NVDA: tree navigation, form errors, and async announcements. Not automatable; not skipped.
- **Automated contrast checks** on every token pair so a palette change cannot silently break AA.
- **Zoom to 200%** and reflow checks on every screen.
- **A dedicated older-user check**: 44px targets, no hover-only affordances, no gesture-only interaction, and no timed interaction. This is a product requirement, not a nicety, so it has named tests.

---

## 7. Performance tests

Benchmarks run in CI against a synthetic family of **1,000 people across 7 generations** with multiple spouses (risk R-2).

| Measurement | Budget (NFR) | Fails the build if exceeded |
|---|---|---|
| Tree layout, 300 visible nodes | < 16ms per incremental expand | ✓ |
| Tree pan/zoom frame time | 60fps | ✓ |
| `GET /tree?depth=3` | < 300ms server-side | ✓ |
| Person profile with relatives | < 300ms | ✓ |
| Search | < 300ms | ✓ |
| App shell, gzipped | < 150KB | ✓ |
| LCP on simulated 4G | < 2.5s | ✓ |

A **regression baseline** is committed, so the failure is "slower than the recorded baseline", not merely "slow in absolute terms" — a tree that degrades 40% while still under budget is exactly the regression that is invisible until it is unusable.

---

## 8. Fixtures and data

- **Factory-based builders** with sensible defaults, so a test states only what it cares about.
- **A "complicated family" fixture** — half-siblings, two marriages, an adoption, a step-parent, a person with only a `circa` year, a person with no known parents, a disconnected branch. Used by kinship, tree, and E2E tests alike, so the awkward cases are permanent rather than invented ad hoc.
- **Deterministic time.** Tests that depend on "today" are a source of silent flakiness; the clock is injected and fixed.
- **Isolation** — each test runs in a transaction that is rolled back, or against a per-worker database, so tests cannot leak state into each other.

---

## 9. CI

Every push:

```
lint · typecheck · unit · integration · contract · component
  · accessibility (axe) · build · e2e · performance benchmarks
```

Pull requests additionally get a preview environment and a seeded demo family. Nightly runs add a full E2E sweep, dependency audit, and migration apply-and-rollback verification.

**A migration must apply cleanly to an empty database *and* roll forward from the previous release's schema.** A migration that only works on a fresh database is not tested.

---

## 10. Manual and exploratory testing

Not everything is automatable, and pretending otherwise is how products ship with obvious problems.

- **Exploratory passes** on the tree with a 1,000-person family — panning, zooming, expanding, collapsing, searching. This is where layout and performance problems that no assertion anticipated will show up.
- **Real device testing** on a mid-range Android and an older iPhone. The performance budget is a proxy; the device is the truth.
- **Older-user walkthroughs.** Invite someone over 65 who has not used the product and watch, without helping. If they hesitate, the design is wrong regardless of what the metrics say (risk R-8).
- **Slow-network and offline** testing with throttled connections and airplane mode.
- **Cross-browser** on the current and previous major versions of Chrome, Safari, Firefox, and Edge, plus iOS Safari and Android Chrome.

---

## 11. Definition of done for a phase

A phase is not complete because the code runs. It is complete when:

1. Its tests pass, including the regression tests for everything it touched.
2. Its documentation is updated to match the code as it now is.
3. No existing behaviour has regressed — the full suite, not a subset.
4. Accessibility checks pass.
5. Security tests for the new surface pass.
6. Loading, empty, error, and success states exist and are exercised (`UI_UX.md` §7).
7. Any known limitation is written down, not discovered later.
