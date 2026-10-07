# FamilyTree

> **A digital home where families can preserve, explore, and pass down their history across generations.**

A standalone family-history web application: an interactive family tree at its centre,
precision-aware dates (exact · circa · range · unknown, Gregorian and Ethiopian calendars),
stories, privacy-first collaboration, and an audit history that never lets an edit happen silently.

Full product thinking lives in [`docs/`](./docs) — start with `PRODUCT_PLAN.md`.

## Status

**Phase 1–5 (frontend, M3 core): built and running on a mock data layer.**

| Area | State |
|---|---|
| Design system + tokens (light/dark, 44px targets, reduced-motion) | ✅ `packages/ui` |
| Domain logic: dates, Ethiopic⇄Gregorian, names, living-status, permissions, cycle check | ✅ `packages/domain` (55 tests green) |
| Pure tree layout engine (deterministic, union-based, cycle-safe) | ✅ `apps/web/src/tree` (11 tests green) |
| Seed integrity + UI primitives under test | ✅ `npm run seed`, jsdom lane (16 tests green) |
| Screens: landing, auth, families, dashboard, tree, people, profile, add/edit, stories, members, settings, account | ✅ |
| Tree interaction: pan/zoom/fit, search-to-highlight, ARIA tree + keyboard, list fallback, add-relative popover | ✅ |
| Database, file storage, email, worker | ⬜ next milestone (Supabase Postgres planned) |

The app currently runs on a **mock data layer** (`apps/web/src/api/client.ts`) that mirrors the
API contracts in `docs/API.md` — so wiring a real backend is a transport swap, not a rewrite.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Demo sign-in: any email + any password opens the seeded demo family (clearly labelled in the UI).
Your edits persist in `localStorage`; **Account → Reset demo data** restores the seed.

## Commands

```bash
npm run dev         # Vite dev server
npm run build       # typecheck + production build (apps/web/dist)
npm test            # Vitest — 82 tests: pure logic in node, components in jsdom
npm run typecheck   # strict TS across all three packages
npm run seed        # assert the demo seed graph is sound (ids, cycles, dates)
```

## Structure

```
familytree/
├── apps/web/            React 19 + Vite SPA (screens, tree canvas, mock API seam)
│   └── src/tree/        Pure layout engine — no DOM, no React, golden-tested
├── packages/
│   ├── domain/          Dates, calendars, kinship, permissions — pure, shared, exhaustive tests
│   ├── ui/              Design tokens + accessible primitives (Button, DateField, Modal, …)
│   └── config/          (reserved for shared tsconfig/eslint)
└── docs/                Product spec, architecture, database, API, UI/UX, security, testing
```

## Conventions worth keeping

- **Every field optional except a name.** "Unknown" is a first-class date answer.
- **Dates are structured, never strings.** `{ calendar, precision, year, month, day }` end to end.
- **Display names are derived, never stored** — one function in `@ft/domain`, used everywhere.
- **Sibling relationships are computed from shared parents**, never stored as edges.
- **The client copy of permissions is a convenience, not a control** — the server enforces.

## Next milestone

1. Supabase Postgres + Drizzle schema per `docs/DATABASE.md` (composite `family_date`, partial indexes, RLS backstop)
2. Live auth (Argon2id sessions) replacing the mock seam
3. Real invites, then media (Phase 6) and the suggestion/approval workflow (Phase 9)
