# FamilyTree — UI/UX Specification

> **Status:** design, not yet implemented.
> Companion: `PRODUCT_PLAN.md` (users, journeys), `ARCHITECTURE.md` §6 (tree implementation), `DATABASE.md` (what data exists).

---

## 1. Design principles

These are ranked. When two conflict, the higher one wins.

1. **The tree is the centre.** The family tree is what no competitor in this product's emotional register offers, and it is what people open the app to see. It gets the best screen real estate, the first navigation slot, and the most design attention.
2. **Never ask for what you don't have.** Every field except a name is optional, at every moment, forever. A user who knows two names must be able to finish and see a result in under two minutes.
3. **Old enough to use at seventy.** A grandparent is a first-class user, not an edge case. Large targets, real contrast, no hover-only affordances, no gesture-only interactions, no timeouts.
4. **Confidence, never false precision.** "circa 1948" is a valid, respected answer. The UI must never imply the app knows more than the family knows.
5. **Nothing disappears silently.** Deletes are reversible, conflicts are shown, and history is one click away.
6. **Warm and calm, not decorative.** Restraint reads as trustworthy for family data. No gratuitous animation, no gradients-as-decoration.

---

## 2. Information architecture

### Desktop — persistent sidebar

```
┌────────────┬──────────────────────────────────────────┐
│ FamilyTree │                                          │
│            │                                          │
│ FAMILY     │                                          │
│  Dashboard │              content area                │
│  Tree      │                                          │
│  People    │                                          │
│  Memories  │                                          │
│  Stories   │                                          │
│ ────────   │                                          │
│ MANAGE     │                                          │
│  Members   │                                          │
│  Settings  │                                          │
└────────────┴──────────────────────────────────────────┘
```

Sidebar groups by intent: **Family** (what you came to look at) and **Manage** (administration, hidden from Viewers). The active family is a switcher at the top when a user belongs to more than one.

### Mobile — bottom bar, five slots

```
   Home    Tree    People    Memories    More
```

Spec §78 is explicit: fifteen items do not go in a bottom bar. **Tree** gets a dedicated slot because it is the centrepiece. `More` opens a sheet for Stories, Members, Settings, and account.

### Route map

| Route | Screen | MVP |
|---|---|---|
| `/` | Landing | ✓ |
| `/register`, `/login`, `/verify`, `/reset` | Auth | ✓ |
| `/families` | Family picker | ✓ |
| `/f/:familyId` | Dashboard | ✓ |
| `/f/:familyId/tree` | Family tree | ✓ |
| `/f/:familyId/people` | People list | ✓ |
| `/f/:familyId/people/:personId` | Person profile | ✓ |
| `/f/:familyId/people/:personId/edit` | Edit person | ✓ |
| `/f/:familyId/people/new` | Add person | ✓ |
| `/f/:familyId/memories` | Photo gallery | ✓ |
| `/f/:familyId/memories/:mediaId` | Media viewer | ✓ |
| `/f/:familyId/stories`, `/stories/:storyId` | Stories | ✓ |
| `/f/:familyId/members` | Members | ✓ |
| `/f/:familyId/settings` | Family settings | ✓ |
| `/account` | Account settings | ✓ |
| `/f/:familyId/events`, `/timeline`, `/places`, `/audio`, `/documents`, `/relationships` | V1 | ✗ |

Routes exist in navigation only when shipped. No dead links to unwritten features.

---

## 3. Screen specifications

### 3.1 Dashboard

The dashboard is useful, not decorative (spec §21). Three stacked regions:

**Family header** — cover photo, family name, and a real stat row: generations, people, photos, stories. Counts come from the server, not computed client-side over a partial cache.

**Recent activity** — the last few actions, each a sentence with a person, a verb, and a link ("Sarah added 5 photos"). Entries respect per-record visibility. A private action never appears in another member's feed.

**Upcoming** — birthdays and anniversaries within 30 days, showing only the detail the viewer is permitted to see. A member without permission sees "Hana's birthday is in 12 days" and no date.

The primary action is always visible: **Add a person**.

### 3.2 Family tree

The centrepiece, and the screen with the most care.

**Structure.** Generations are rows; within a generation, people are ordered by birth year where known, else by name. A person renders as a card: profile photo (or initials), display name, and lifespan in a compact, low-contrast line. Couples sit adjacent and joined; children fan out beneath.

**Chrome.** A floating toolbar carries zoom in/out, fit, centre, expand-all, collapse-all, and a layout toggle (descendant ↔ ancestor, per spec §12). It stays out of the way and never overlaps a node at rest.

**Interaction.**
- Drag to pan; pinch or scroll to zoom; double-click a node to centre.
- Click selects and opens a small popover: **Open profile · Add parent · Add child · Add spouse · Highlight branch · Hide branch**.
- Search filters the tree to matching nodes and dims the rest, rather than hiding them — a family member is often looking for someone *near* a name they half-remember.
- `Highlight branch` and relationship-path highlighting recolour edges, animated but brief (180ms) and disabled under reduced motion.

**Empty state (spec §61).** Not a blank canvas:

> **Your family story starts here.**
> Add your first family member and begin building your family tree.
> `[ Add a family member ]`

The first tree appears after one person is added, with a hint on how to add their parent. A single node is a legitimate, non-embarrassing state.

**Large families.** Depth is fetched per expansion; collapsed branches show a "+N" badge so the user knows there is more without loading it. If a subtree exceeds the render budget, it collapses to a summary node with a count.

**Accessibility (spec §57).** The tree is an ARIA tree: `role="tree"`, nodes with `aria-level`, `aria-expanded`, `aria-selected`. Arrow keys traverse, Home/End jump to first/last sibling, Enter opens a profile, Escape clears selection. A live region announces the selected person. Every relationship visible in the tree is also reachable through the people list and profile pages — **the tree is never the only route to information**, which is what makes the non-canvas fallback genuinely equivalent rather than a degraded apology.

**Reduced motion / no canvas.** Transitions become instant. Without canvas support the same subgraph renders as a nested, keyboard-navigable list with indentation showing generation.

### 3.3 Person profile

A mini-biography (spec §14), not a data table.

```
┌──────────────────────────────────┐
│ [ photo ]   Abebe Abraham        │
│             1948 — 2019          │
│             Grandfather           │
│             Born in Gondar        │
└──────────────────────────────────┘
About          [ biography prose ]
Family         Parents · Spouse · Children · Siblings   (chips)
Content        Stories · Photos · Videos · Audio · Documents · Events
History        [ 3 changes ]        (expands to who/what/when)
```

- **Lifespan** renders from dates *with their precision*: "1948 — 2019", "circa 1948 — 2019", "born circa 1948". Never a fabricated "1948 – 1948" for a single year.
- **Family chips** are live edges, not static text. "View parent" navigates; hovering highlights the pair in the tree.
- **History** is present from MVP because `change_records` exists from MVP. Showing it early builds the trust the collaboration model depends on.
- **Related people** are computed from the graph, never stored on the person.

### 3.4 Add / edit person

Progressive disclosure, and the most important form in the product.

- **Required:** name (a single "Name" field accepting "Abebe Abraham", "Abebe", or "A. Abraham" — an Ethiopian or Ethiopian-American family may not have a surname tradition, and forcing three fields would be a barrier).
- **Then, optional:** nickname, gender, photo, birth date + place, death date + place, biography, occupation.
- **Advanced** (collapsed): education, languages, current location, sources, per-record privacy.

**Date capture is the delicate part.** A precision selector sits beside every date: *Exact · Month & year · Year only · Circa · Range · Unknown*. Selecting "Circa" renders "c. 1948". Selecting "Unknown" is a first-class, respected choice that stores `precision = 'unknown'` — a user who does not know a birth year has given real information, and the app must not make that feel like a failure.

Places are typeahead against existing places, so reuse happens by default and duplicates do not accumulate (spec §34).

**Privacy control** is on the form, not buried in settings, and it defaults to the safest option.

### 3.5 Memories

Grid by default, uniform tiles, aspect-ratio preserved so the grid does not reflow as images load. Filter by person, year, place, and album. Click opens a viewer with keyboard navigation, caption, tags, and "who is in this photo" (manual tagging, spec §27).

**Upload** is drag-and-drop *and* a file input — the file input is not a fallback, it is the accessible primary path. Per-file progress, retry on failure, and a clear message on rejection. Nothing is lost if the connection drops: the selection persists until each file is confirmed.

### 3.6 Stories

List of cards with cover image, title, author, and period label. The editor is a focused writing surface: title, body, then a secondary row for people, date, place, and attachments. Autosave drafts locally *and* server-side, with a visible "Saved" state. Publishing is explicit — a draft is private to its author regardless of the visibility setting.

### 3.7 Members and invitations

Table of people with name, email, role, join date. Change role inline. Remove requires confirmation naming the person.

**Invite** takes an email and a role, and shows the link to share for anyone without that address. Pending invites are listed with expiry and a revoke action. State is unambiguous: an invite shows *Invited*, never *Member*, until accepted.

### 3.8 Settings

Family settings: name, description, cover photo, default calendar (Gregorian / Ethiopian), default visibility for new records.

Account settings: profile, email, password, locale, notifications, data export, and **delete account** — which is a deliberate, multi-step confirmation that states plainly what is deleted, including that other families' data referencing the account is retained and why.

---

## 4. Component inventory

Design-system primitives in `packages/ui`, all React, all accessible, all token-driven.

**Primitives** — Button (primary/secondary/ghost/danger, sm/md/lg), Input, Textarea, Select, Combobox (typeahead for places and people), Checkbox, Radio, Switch, DateField (with precision selector), Avatar, Badge, Card, Modal, Drawer, Tabs, Tooltip, Toast, Alert, Skeleton, EmptyState, Spinner, Pagination, FileDrop.

**Product components** — PersonCard, PersonNode (tree), RelationshipChip, StoryCard, MediaTile, MediaViewer, TimelineItem, EventCard, PlaceChip, MemberRow, ActivityItem, InvitationForm, VisibilityPicker, RolePicker, DateDisplay (precision-aware rendering), GenerationLabel, StatTile.

**Rules.** Every primitive takes `className` and forwards refs. No component hardcodes a colour, size, or font — all come from tokens. No component fetches its own data; data arrives as props or through a route-level loader. These two rules are what stop 21 screens from becoming 21 unrelated apps (spec §60).

---

## 5. Design tokens

A warm, calm, trustworthy palette. Placeholder values — real brand direction comes after the product is proven.

**Colour.** A warm parchment/paper base, deep warm brown-black ink, a single confident accent for action. Semantic tokens only (`--color-surface`, `--color-text`, `--color-accent`, `--color-danger`); components never reference a raw hue. Light and dark both defined; dark is a genuine re-design of the palette, not an inversion. Contrast ≥ 4.5:1 for text, ≥ 3:1 for large text and UI borders — verified in tests, not by eye.

**Type.** A humanist serif for headings and names (the archive should feel written, not administered) and a highly legible sans for UI and body. Base 16px, scaling fluidly to 20px. Line height ≥ 1.5 for body, ≥ 1.25 for headings. **Amharic (Ethiopic) is a first-class citizen**: the stack declares `Noto Sans Ethiopic`, and heading line-height is checked with Amharic text, which needs more vertical room than Latin at the same size.

**Space.** A 4px base scale. **Touch targets are 44px minimum**, independent of visual size — the visual box can be smaller than the hit area, but the hit area is never smaller than 44px.

**Shape.** Moderate radii (8–16px). Soft, low-spread shadows. Nothing harsh; nothing glassy.

**Motion.** 120–240ms, ease-out. `prefers-reduced-motion: reduce` collapses all durations to near-zero and disables parallax, scroll-linked effects, and auto-playing anything. **No motion is ever load-bearing** — nothing is communicated only by animation.

---

## 6. Responsive behaviour

Not a scaled-down desktop. Three genuinely different layouts.

| | Desktop | Tablet | Mobile |
|---|---|---|---|
| Nav | Persistent sidebar | Collapsible rail | Bottom bar + sheet |
| Tree | Full canvas, multi-row | Full canvas, tighter gutters | Compact list-first; tree opens full-screen, pan/zoom via pinch |
| Profile | Two-column, sticky media | Two-column, narrower | Single column, media first |
| Editor | Full width, inline metadata | Same | Full-screen sheet |
| Density | Comfortable | Comfortable | Comfortable — **not reduced** |

**Deliberately not reduced on mobile:** touch target size, contrast, and type scale. Only layout changes. Reducing density is how a product designed for grandparents ends up unusable for them on the phone they actually own.

Portrait phones get a full-screen tree with a bottom sheet for actions, because a side panel beside a 1,000-node canvas is unusable. Thumb reach is the constraint, not screen size.

---

## 7. State coverage

Every data-backed view handles all four states (spec §62, §63). No exceptions.

**Loading.** Skeletons matching the final layout's shape, so nothing jumps on arrival. The tree gets a dedicated skeleton that mirrors the node geometry. Uploads show per-file progress, never an indefinite spinner. A request over 10 seconds shows a message and keeps a way to retry — a frozen screen is a bug, not a slow network.

**Empty.** Every empty state names what would be here and offers the action that creates it. Empty is a legitimate state, not an error:

> **No photos yet**
> Add your first photo to start building your family's visual history.
> `[ Add photos ]`

Differentiated states: no family yet → create one; family with no people → add a person; search with no results → clear filters, and suggest a looser search; people exist but none linked → explain linking.

**Error.** Written for a non-technical, possibly anxious user. Cause and next step, never a code:

> We couldn't upload this photo — it looks larger than 10 MB.
> Try a smaller file, or [choose another photo].

Every error offers a retry that does not lose the user's input. Permission errors say so plainly and offer the request-a-role path. Validation errors anchor to the offending field and say what would fix it. Global toasts carry an error id users can quote in support.

**Success.** Toasts for background completions; the UI updates in place rather than navigating away. Confirmations for destructive actions name the specific object and the consequence.

---

## 8. Accessibility

WCAG 2.1 AA is the floor, not the aspiration (spec §57). Concrete commitments:

- **Keyboard** — everything reachable and operable; visible focus on every interactive element; no traps except modals, which trap deliberately and restore focus on close; skip-to-content link.
- **Screen readers** — semantic landmarks; the tree as a real ARIA tree; live regions for async updates; icon-only buttons named; image alt text required, with an explicit "decorative" option.
- **Contrast** — ≥ 4.5:1 text, ≥ 3:1 large text and borders, verified in automated tests so it cannot regress.
- **Text** — resizable to 200% with no loss of content or function; no fixed-height text containers; layout survives long names in any script.
- **Touch** — 44px minimum, generous spacing to prevent mis-taps.
- **Motion** — `prefers-reduced-motion` respected throughout; no auto-playing video with sound; nothing auto-advancing.
- **Forms** — real labels, errors tied with `aria-describedby`, no placeholder-as-label.
- **Testing** — axe-core in CI on every screen, plus manual screen-reader passes at Phase 11. Automated checks catch roughly a third of real issues, so the manual pass is not optional.

**Language and script.** `lang` switches per user locale; Ethiopic text declares `font-family` explicitly rather than relying on fallback. Dates always state the calendar when it is not the default, so "5 March" is never ambiguous between calendars.

---

## 9. First-time experience

The landing screen communicates the value in one line and shows a real, populated tree — not a stock illustration:

> **Your family's story, kept together.**
> A private place for your family's people, stories, and memories — built to be passed down.

Primary action: **Start your family tree**. Secondary: **I already have an account**.

Post-registration, onboarding is a short checklist, never a modal sequence:

```
✓ Create your family
→ Add yourself
  Add a parent
  Add a photo
  Invite a relative
```

Skippable at every step, dismissible, and resumable. Progress persists. **A user who abandons onboarding at step two has still created a family and can return to a working app** — the worst outcome to avoid is someone with data who cannot find their way back.

---

## 10. Key user flows

### Add a person (the core loop)

```
People → Add person → type a name → Save
   → appears in list
   → appears in tree
   → profile offers "Add a parent"
   → parent added → tree now shows two connected nodes
```

Success is a visible connection appearing. Everything in the product exists to make that moment happen.

### Invite a relative

```
Members → Invite → email + role → Send
   → "Invite sent to X. They'll get access after accepting."
   → [Copy invite link] for anyone without an email
```

### Correct a date safely

```
Profile → Edit → change year → Save (carries the read version)
   → conflict if someone else edited meanwhile → show both, let the user pick
   → on save: change_record written, History shows "you changed 1947 → 1948"
```

---

## 11. Open questions

Recorded rather than silently decided; none blocks Phase 1.

1. **Do we need a public-facing "shared view" for a deceased ancestor?** Guests viewing a single published profile is a real need, but it is a privacy surface, and it does not serve the MVP success criteria. Deferred; the `public` visibility level exists in the schema so deferring is free.
2. **How far can the tree go before people want something other than a tree?** A large family may read better as a timeline. The timeline is V1; if research contradicts this, the layout abstraction absorbs it.
3. **Do we need a native app?** A grandmother recording a story on her own phone is a real use case that a PWA can partly serve. Not now — no evidence yet.
