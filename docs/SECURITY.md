# FamilyTree — Security

> Companion: `ARCHITECTURE.md` §4–5 (auth, storage), `DATABASE.md` §9–11 (tenancy, RLS), `API.md` §1.2 (error contract).

---

## 1. Threat model

**What we are defending:** family history, living people's personal data, and identity claims. The assets are not financial, so the realistic adversaries are:

| Adversary | Capability | Wants |
|---|---|---|
| **Unauthenticated stranger** | Network access, an email address | Any family data at all |
| **Viewer-role member** | A legitimate invite, least privilege | Records marked private; delete rights; other families |
| **Compromised session** | A stolen cookie | Persistent access to one family |
| **Malicious contributor** | Write access to their own content | Injection, stored XSS, resource exhaustion, overwriting others |
| **A well-meaning relative** | Full legitimate access | Accidentally destroying history |
| **Database or storage leak** | A backup, a misconfigured bucket | Bulk family data |

The last two matter as much as the first. Most family data is destroyed by accident and misunderstanding far more often than by an attacker, so "undo" and "history" are security controls here, not features (`DATABASE.md` §10, `PRODUCT_PLAN.md` §8).

**Explicit non-goals.** We do not defend against a malicious family owner — they own the data by definition. We do not attempt to make a public invite link unguessable beyond its token strength.

---

## 2. Authentication security

| Control | Implementation |
|---|---|
| Password hashing | **Argon2id**, memory-hard. Parameters stored per hash so they can be raised later without invalidating existing users |
| Password storage | Never returned by any query. The auth projection excludes `password_hash` by construction, so a `select *` cannot leak it |
| Session token | 256-bit random, `httpOnly` + `Secure` + `SameSite=Lax`, `__Host-` prefix, `Path=/` |
| Session storage | Only a SHA-256 **hash** of the token is stored — a database read cannot impersonate anyone |
| Session lifetime | 30 days sliding, absolute cap 90 days |
| Session management | Users can list and revoke sessions (`API.md` §2) — a stolen session must be killable |
| Revocation on change | Password reset, email change, and account deletion revoke all other sessions |
| Enumeration | Login, register, and password reset are non-committal about whether an account exists; response timing is normalised |
| Rate limiting | Per IP on all auth routes; per account on login; tighter on reset (an attacker must not enumerate by triggering resets) |
| Verification and reset tokens | Single-use, expiring, stored hashed, invalidated on use and on password change |
| Timing attacks | All credential comparisons constant-time |

**Why server-side sessions, not JWTs.** Revocation. A family archive is long-lived and shared across devices, and a self-contained token that cannot be revoked before expiry is a standing risk. Sessions cost one indexed lookup on a request we are already making.

---

## 3. Authorization

Two independent layers, both server-side. The client copies the logic to hide what a user cannot do; the client copy is never a control.

**Layer 1 — role** (family-scoped): `owner` > `admin` > `contributor` > `viewer`, on `family_members`. Verified on every request from the path's `family_id`, never from anything the client sends.

**Layer 2 — record visibility**: `private` | `family` | `selected` | `public`, on each record. `selected` consults an ACL row set; `private` means creator plus explicit ACL grants only.

### 3.1 Enforcing it

- Every repository requires a `FamilyScope` in its constructor (`DATABASE.md` §9). A repository cannot be built without a resolved family, so an omitted tenant filter is a **compile error**, not an audit finding.
- **Row-Level Security** is enabled on all family-scoped tables as a backstop (`DATABASE.md` §11). A raw query, a migration, or a compromised path still cannot read across families.
- **Nothing is authorised by id possession.** Knowing a person's UUID grants nothing; every read re-checks visibility.

### 3.2 Not-found over forbidden

A caller who cannot see a record receives `404`, identical to a record that does not exist. Confirming existence is itself a disclosure — it tells a stranger how many people a family has, whether a named relative is in the tree, and whether a suspected person has an account. The trade-off is a slightly less helpful error for a legitimate user, which is the correct way round for a private archive.

### 3.3 Living people

Default-deny for the sensitive fields of anyone inferred to be living (spec §20): exact dates (year-only is shown instead), contact details, private notes, documents, and sensitive events. A user must take an explicit, audited action to widen any of it.

Living status is resolved from the death date, with a ~110-year window, unless explicitly asserted. It is the most heavily tested piece of logic in the product, because a mistake here exposes a real person's data.

---

## 4. Input validation and injection

- **Validate at the boundary.** Zod schemas at the route; invalid input never reaches a service.
- **SQL injection** — parameterised queries only, via Drizzle. No string-built SQL anywhere, including for the recursive CTEs, which take parameters.
- **XSS** — the API returns structured text, not HTML. The client renders a constrained Markdown/ProseMirror document through an allowlist sanitizer, with no raw-HTML path. Content-Security-Policy is set with a nonce and without `unsafe-inline` for scripts.
- **Rich text** is stored sanitised. Sanitising at render time instead would mean one missed render site is a stored XSS.
- **URLs** (sources) are validated to `https` only, with `javascript:` and `data:` rejected, and are never fetched server-side — closing SSRF.
- **Enums** are Postgres enums, so an unknown value is a database error rather than a silently stored string.

---

## 5. File upload security

- **Bucket is private.** No public URLs exist anywhere in the system. Access is a signed URL minted after an authorization check, TTL in minutes.
- **The API never proxies media bytes**, so a large upload cannot exhaust API memory or bandwidth.
- **Validation is by byte sniffing**, not by declared MIME type or extension. A file whose magic bytes disagree with its declared type is rejected and quarantined. Client-declared types are untrusted input.
- **Presigned URLs are scoped**: one key, one content type, one maximum size, 15-minute expiry. A URL cannot be repurposed for another key or a larger file.
- **Keys are server-generated and opaque.** Users never supply a path, so a crafted key cannot address another family's file. Keys are UUID-based, so they are unguessable even if a bucket is misconfigured.
- **Limits**: 10MB image, 500MB video, 25MB audio, 50MB document. Enforced in shared domain code, authoritative on the server.
- **Orphaned uploads** are swept after 24h.
- **No user content is served inline as HTML.** Downloads are served with `Content-Disposition: attachment` and a conservative `Content-Type`, so an uploaded file can never execute in our origin.

---

## 6. Transport and headers

- **HTTPS only**, HSTS with a long max-age and `preload`.
- **CSP** with nonces, no `unsafe-inline` for scripts.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — camera/microphone/geolocation denied by default; **geolocation is never requested**, since precise coordinates on a family home are sensitive (`DATABASE.md` §5).
- `X-Frame-Options: DENY` — the archive is never framed, which also blocks clickjacking on owner-only actions.
- **CORS** is an explicit allowlist. Never `*` with credentials.
- `Strict-Transport-Security`, plus secure-only cookies in every environment including local HTTPS.

---

## 7. CSRF

State-changing requests require **both** the session cookie and a matching `X-FamilyTree` header, which a cross-site caller cannot set without a successful preflight. Reinforced by `SameSite=Lax` cookies and a same-origin `Origin` check. Applied to every non-`GET` request (`API.md` §12).

---

## 8. Data protection

**At rest** — managed encryption at rest for the database and object storage. Sensitive columns (password hashes, session tokens, invite tokens) additionally encrypted in the application where it does not impair querying.

**In transit** — TLS 1.2+ everywhere, including between the API and the database and object storage.

**In logs** — no request bodies on auth routes, no password or token values, no family content. A structured log carries a request id, route, status, and duration. Field names such as `email` and `displayName` are treated as personal data and are redacted by default; a bug report should never become a data-exposure incident.

**In error responses** — no stack traces, no SQL, no internal ids. `requestId` is the only handle back to a log line.

**Third parties** — transactional email is the only processor, and it receives an address and a template name, nothing more. Analytics is first-party and aggregate only; we do not instrument user content or send family data to third-party analytics (spec §88, §89).

---

## 9. Abuse and resource limits

| Vector | Control |
|---|---|
| Brute force | Per-IP and per-account rate limits, exponential backoff, temporary lockout |
| Mass account creation | IP and email-domain throttles; verification required before real use |
| Invite spam | Per-user invitation quota; the one-pending-per-email index blocks duplicate live links |
| Storage exhaustion | Per-family storage quota; per-file size caps; orphaned-upload sweep |
| Expensive queries | Statement timeout, capped keyset page sizes, capped tree depth, query complexity limits |
| Denial of service | Request body caps, upload concurrency caps, per-IP request ceilings |
| Enumeration through search | Search results are permission-filtered; a hit on an invisible record returns nothing at all |

---

## 10. Data ownership and lifecycle

Documented before implementation, per spec §67.

**A family** is owned by the user who created it. Owner and Admins manage members, roles, privacy, and settings. Deleting a family is Owner-only, requires `confirm`, is soft for 30 days, and is fully reversible within that window.

**A person record** belongs to the family, not to the person who entered it. Any Contributor may add; a Contributor may edit their own additions; editing others' records requires Admin, except for fields explicitly marked collaborative in V1's suggestions model. Deletion requires Admin.

**A user account** belongs to the user. They can export everything at any time and delete the account at any time. Deleting an account does **not** delete family data that others depend on — it anonymises the author reference, preserving history and attribution structure while removing the personal identifier. Families are told this clearly and can reassign ownership first.

**Media** belongs to the family. Storage objects are retained 30 days after a soft delete, so an accidental delete is recoverable.

---

## 11. Verification

Security claims are verified by test, not by review. Each of these is a required test, and a failure blocks the release:

1. **Cross-tenant isolation** — a member of family A cannot read, write, or infer the existence of any record in family B, by any endpoint, including by direct id.
2. **Visibility enforcement** — a Viewer cannot fetch a `private` record by id, cannot list it, cannot find it via search, and does not see it in a feed or a count.
3. **Living-person defaults** — exact dates and private notes of an inferred-living person are withheld from a Viewer.
4. **Role enforcement** — every mutating endpoint rejects a role below the documented minimum, tested per role.
5. **Draft isolation** — a draft story is invisible to other members regardless of its `visibility` value.
6. **CSRF** — a state-changing request with the session cookie but without the custom header is rejected.
7. **Session revocation** — a revoked session token stops working immediately, not at expiry.
8. **Upload sniffing** — a file whose bytes disagree with its declared type is rejected, and the object is never linked to a media row.
9. **XSS** — stored payloads in every text field render inert; CSP has no `unsafe-inline` for scripts.
10. **RLS** — a query executed outside the repository layer still cannot cross a family boundary.
11. **Injection** — SQLi and NoSQL-style payloads in every parameter return a validation error, not a data leak.
12. **Rate limiting** — auth endpoints refuse sustained abuse and do not become a denial-of-service vector against a legitimate user.

---

## 12. Known limitations

Stated plainly rather than left to be discovered.

- **No 2FA in MVP.** Session revocation limits the blast radius, but a stolen password is still a stolen password. 2FA belongs in V1 and is a genuine gap until then.
- **No malware scanning on upload.** Sniffing catches type confusion, not a malicious file. A Viewer's own bucket is private and signed-URL-only, so this is contained, but a family sharing files widely raises the stakes. Scanning belongs in V1.
- **Invite links are bearer tokens.** Anyone holding an unaccepted link can accept it. Mitigated by short expiry, single use, and revocation — the link should still be shared over a channel the family trusts.
- **Rate limiting is per-instance in-process.** Correct at this scale; a shared store is needed before horizontal scaling, and that is a known TODO at the scaling threshold, not a current hole.
- **No formal third-party penetration test.** The automated suite covers the checklist in §11, but an independent review before inviting real families is the honest bar for a product holding this kind of data.
