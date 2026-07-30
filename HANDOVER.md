# Handover — 2026-07-30 07:15

## Goal

Continuing "VillageRide Sri Lanka" (Uber/DiDi-style ride-hailing platform, see
prior handover context in git history). This session's explicit ask: rebuild
the driver side to be "modeled after Uber and Lyft," including **Sri Lankan
government regulations**, a **driver verification process**, and
**qualification/performance standards** — not just a document-upload form.

Also handled two small housekeeping items first: gave the user the seeded
Super Admin login, and added a self-service password-change option (now on
the customer/driver profile pages and the admin settings page).

## State

**Everything in this session is built, committed, pushed, and deployed.**
`git status` is clean; `main` matches `origin/main`; latest commit `6a9a298`
is live in production at **https://villageride.vercel.app**.

Four phases, each its own commit, each independently verified before moving
on:

1. **`76153c1`** — Schema + compliance engine. New `LicenceClass` enum (13 DMT
   licence classes), 6 new `DocumentType`s (revenue licence, VET certificate,
   police clearance, GN certificate, medical certificate, fitness
   certificate), `Driver`/`Vehicle`/`Document` gained the fields the
   compliance engine needs, new `DriverEligibilityRule` model holds
   platform-set thresholds (overridable per association). Pure evaluation
   logic lives in `src/lib/compliance.ts` (`evaluateDriverCompliance`) — takes
   driver/vehicle/documents/rules, returns blockers + warnings, no I/O.
2. **`193f792`** — Driver registration (`src/actions/auth.ts`,
   `src/components/auth/driver-register-form.tsx`) now collects NIC,
   DOB, address/district/GN division, licence class + issue date,
   insurer/policy number, revenue licence, emission test (with an
   exemption checkbox), certificate of fitness (conditional on vehicle
   type), police clearance, medical certificate — plus every corresponding
   document upload. Validates licence-class-permits-vehicle-type, driver
   age, and vehicle age against the resolved eligibility rule before
   touching the DB. New drivers land in `DOCUMENTS_UNDER_REVIEW`.
3. **`8cc58ff`** — Verification workflow. New page
   `/dashboard/association/drivers/[id]` — every document has its own
   approve/reject control (rejection requires a reason). Approving the last
   required document auto-advances the driver: `DOCUMENTS_UNDER_REVIEW` →
   `BACKGROUND_CHECK` (or straight to `APPROVED` if the association doesn't
   require police clearance) → `APPROVED` once the background check clears
   (`src/actions/association.ts`: `reviewDocumentAction`,
   `startBackgroundCheckAction`, `clearBackgroundCheckAction`,
   `failBackgroundCheckAction`).
4. **`8b7fa09`** — Enforcement. `src/lib/enforce-compliance.ts`
   (`reconcileDriverCompliance`) re-checks a driver and applies the result: a
   performance blocker (rating/cancellation rate) → `DEACTIVATED`, never
   auto-clears; any other blocker (expired document) → `COMPLIANCE_HOLD`,
   self-heals once resolved. No cron/background jobs in this app, so it's
   called opportunistically: going online, browsing for trips, accepting a
   trip, and on every driver-dashboard page load.

Plus **`6a9a298`** — a same-session production hotfix: `vercel-build` never
explicitly ran `prisma generate`, so when Vercel restored a build cache from
before the schema changes (package.json unchanged → npm skipped reinstall →
no postinstall hook fired), the seed script crashed reaching
`prisma.driverEligibilityRule` on a stale client. Fixed by prepending
`prisma generate` to the `vercel-build` script. First deploy of phase 1–4
errored in production for exactly this reason; the fix redeployed clean
(`villageride-lxv3o5ae2-dkns.vercel.app`, verified `Ready`).

Earlier in the session, also shipped and verified in production:

- **`c2897f3`** — Driver document/photo uploads moved from `public/uploads/`
  (never persists on Vercel's serverless filesystem) to a real **Vercel Blob**
  store (`villageride-uploads`, public access). `BLOB_READ_WRITE_TOKEN` is in
  both `.env.local` and the Vercel project env.
- **`d109817`** — Password-change UI (`src/components/dashboard/
  change-password-form.tsx`, `changePasswordAction` in
  `src/actions/profile.ts`) on customer profile, driver profile, and admin
  settings pages.
- **`ba49442`** — Found and fixed a **pre-existing, unrelated** bug while
  testing the above: `signIn(..., { redirect: false })` throws
  `CredentialsSignin`/`AuthError` on bad credentials in this NextAuth version
  rather than returning `{ error }` as all four call sites in
  `src/actions/auth.ts` assumed — any mistyped password crashed straight to
  Next's generic error page. Fixed with a `trySignIn()` wrapper that catches
  `AuthError`.
- Reset the Super Admin's production password (the one in the previous
  handover had gone stale/unverifiable) via the same one-time
  `SEED_RESET_ADMIN_PASSWORD` mechanism as before, then removed the env var
  again. **Current Super Admin credentials were given directly to the user in
  chat — not repeated here since they may have since changed their own
  password via the new change-password form.**

## Key decisions

- **No national Sri Lankan regulatory framework for app-based taxis exists
  yet** (confirmed via web search: NTC gained authority over three-wheelers
  in June 2023, a fuller framework is expected in 2026, and there is
  currently no state authority regulating app-based taxi companies
  specifically). So the compliance model draws a hard line: things that are
  **actually legally required today** (DMT driving licence + class, NIC,
  annual revenue licence, Vehicle Emission Test certificate, valid insurance,
  police clearance, Grama Niladhari certificate) are modeled as
  `DocumentType`s the registration flow collects. Things that are the
  **platform's own choice** (minimum age beyond the DMT's 18, minimum rating,
  max cancellation rate, minimum licence-holding years, max vehicle age) live
  in `DriverEligibilityRule`, seeded with a sensible global default and
  overridable per association — not hardcoded as if they were law.

- **Licence class must legally permit the vehicle type.**
  `src/lib/licence-classes.ts` maps DMT classes to the vehicle types they
  cover (e.g. a three-wheeler needs B1/B, a bus needs D1/D/DE, a lorry needs
  C1/C/CE) and both registration and the compliance engine enforce it — you
  cannot register a bus on a motorcycle licence.

- **Performance deactivation never auto-clears; compliance holds always do.**
  This is the one deliberate asymmetry in `reconcileDriverCompliance`. A
  document-expiry hold is mechanical — renew the document, the next
  reconcile pass puts you straight back to `APPROVED`. A rating/cancellation-
  rate deactivation is a policy decision an association must manually reverse
  (`reinstateDriverAction`) even if the driver's numbers later recover —
  mirrors how Uber/Lyft treat the two situations differently in practice.

- **Enforcement is opportunistic, not scheduled** — this app has no
  cron/background-job runner, so `reconcileDriverCompliance` is called at
  every point where it actually matters (go online, browse trips, accept a
  trip, open the dashboard) rather than on a sweep. A document that lapses
  mid-shift is caught the next time any of those fire, not instantly.

- **`offeredTrips`/`acceptedTrips` move together on accept, not on offer.**
  This app's matching is pull-based (a driver pulls from a shared list of
  open requests and accepts directly — there's no explicit per-driver "offer"
  event to decline). So cancellation rate is calculated as "of trips this
  driver accepted, how many did they then cancel" rather than a true
  offer-conversion rate. This is a deliberate simplification to fit the
  existing architecture, documented in a comment at the increment site
  (`src/actions/trips.ts`, `acceptTripAction`).

- **Association verification page uses per-document approve/reject with
  auto-progression**, not a single "approve driver" button. Approving the
  last outstanding required document is what moves the driver forward — this
  mirrors how real onboarding pipelines move a driver forward the moment
  every check clears, rather than requiring a redundant final "approve"
  click.

## Files touched

New:
- `src/lib/compliance.ts` — pure compliance evaluation engine + document
  labels/issuing-authority maps + `DRIVER_STATUS_LABELS`/`VARIANT`.
- `src/lib/licence-classes.ts` — DMT licence class ↔ vehicle type mapping.
- `src/lib/districts.ts` — 25 SL districts + NIC format validator.
- `src/lib/enforce-compliance.ts` — `reconcileDriverCompliance`, the only
  place that actually writes a compliance-driven status transition.
- `src/lib/storage.ts` — rewritten to use `@vercel/blob`'s `put()`.
- `src/components/dashboard/change-password-form.tsx`,
  `changePasswordAction` in `src/actions/profile.ts`.
- `src/app/dashboard/association/drivers/[id]/page.tsx`,
  `src/components/association/document-review-row.tsx`,
  `src/components/association/background-check-panel.tsx`.
- `prisma/migrations/20260730020000_driver_verification_and_sl_compliance/` —
  purely additive (nullable/defaulted columns, one new table), safe on
  existing data.

Substantially rewritten:
- `src/actions/auth.ts` — registration schema + action, ~3x longer;
  `trySignIn()` wrapper added at the top.
- `src/actions/association.ts` — `reviewDocumentAction` + 3 background-check
  actions added.
- `src/actions/driver.ts` — `toggleOnlineAction` and
  `getAvailableTripRequests` both reconcile first.
- `src/actions/trips.ts` — `acceptTripAction` reconciles + increments
  counters; `cancelTripAction` increments `cancelledTrips` + reconciles on
  driver cancellation; `rateTripAction` sets `ratingCount` + reconciles.
- `src/app/dashboard/driver/page.tsx` — reconciles on load, new alerts for
  every status the pipeline can produce, expiry-warning banner.
- `src/components/driver/driver-console.tsx` — surfaces `toggleOnlineAction`
  errors instead of silently reverting.
- `src/components/auth/driver-register-form.tsx` — full rewrite, ~4x longer.
- `prisma/seed.ts` — seeds the global `DriverEligibilityRule` row.
- `package.json` — `vercel-build` now runs `prisma generate` first.

## Gotchas / constraints learned

- **Local embedded Postgres does not survive a background-task interruption
  or the machine sleeping.** It came back up cleanly both times just by
  re-running `node scripts/dev-db.mjs` in the background (data in `.pgdata/`
  persisted fine) — just don't assume it's still running after any gap.

- **`prisma migrate dev` refuses to run non-interactively** in this
  environment ("Prisma Migrate has detected that the environment is
  non-interactive"). To generate a migration here: create the shadow DB
  manually (`prisma db execute --url ... <<< "CREATE DATABASE x_shadow"`),
  then `prisma migrate diff --from-migrations prisma/migrations
  --to-schema-datamodel prisma/schema.prisma --shadow-database-url ...
  --script > migrations/<name>/migration.sql`, then `prisma migrate deploy`
  to apply it. Works fine, just not the interactive `migrate dev` flow.

- **`vercel-build` must explicitly `prisma generate`** — see the `6a9a298`
  commit above. Vercel's build-cache restoration means "the schema changed"
  is not reliably enough to get a fresh client; only an explicit generate
  step is. Now fixed, but worth remembering if a future schema change causes
  the same class of failure again.

- **Two local test driver fixtures needed backfilling.**
  `testdriver@villageride.lk` and `pendingdriver@villageride.lk` (local-only,
  see credentials table below) were created via ad-hoc scripts *before* this
  session's compliance fields existed, so they were missing NIC/DOB/licence
  class/several required documents and had `backgroundCheckStatus:
  NOT_STARTED`. Backfilled directly in the local DB so they still work as
  `APPROVED`, fully-compliant test accounts — if either behaves oddly, that's
  why, and the fix is the same kind of direct DB backfill, not an app bug.

- **This session's headless Browser pane cannot deliver a click Base UI's
  `Switch` primitive accepts.** Confirmed two ways: the `computer` tool's
  `left_click` on the switch's own bounding-box coordinates, and a manually
  dispatched `pointerdown`/`pointerup`/`click` sequence via
  `javascript_tool` — neither flipped the switch's `aria-checked` or hit the
  server action. `Select` dropdown option clicks had the same
  coordinate-resolves-to-(0,0) issue earlier in the session. Everything else
  (forms, buttons, links, checkboxes with `Input type="checkbox"`) worked
  fine. If a future session needs to verify the online/offline toggle
  through the UI, expect this same friction and prefer direct server-side
  testing of `reconcileDriverCompliance`/`toggleOnlineAction` instead (see
  "Verification approach" below) — it isn't a code defect.

- **`reconcileDriverCompliance` doesn't call `auth()`**, unlike almost every
  other exported function in `src/actions/*.ts`. That's deliberate — it made
  it possible to test the entire enforcement engine directly from a script
  against the local DB without needing a real Next.js request context, which
  `signIn()`-touching code (registration, login) cannot do. If you need to
  script-test something that goes through `auth()`, you'll hit `headers()
  was called outside a request scope` — only feasible through a real browser
  session or by testing the pure logic it delegates to instead.

## Known test accounts

**Production** (https://villageride.vercel.app, real Neon DB):
| Role | Email | Password | Notes |
|---|---|---|---|
| Super Admin | `admin@villageride.lk` | *(given directly to user in chat this session; not repeated here in case it's since been changed via the new change-password form)* | |
| Association Admin | `mataraadmin@villageride.lk` | `MataraAdmin123!` | Matara Taxi Society. |
| Customer | `prodverify@villageride.lk` | `VerifyPass123!` | |

No driver accounts exist in production yet — this is why deploying the
compliance/enforcement changes this session carried zero risk of locking
anyone out.

**Local only** (embedded Postgres, `.pgdata/`):
- `admin@villageride.lk` — password unknown/random (never captured for
  local; reset it the same way prod was reset if you need it: set
  `SEED_RESET_ADMIN_PASSWORD` env var, run the seed script, unset it again).
- `assocadmin@villageride.lk` / `AssocAdmin123!` — Kandy Town Taxi
  Association admin. Used this session to verify the document-review
  pipeline live.
- `testdriver@villageride.lk` / `DriverTest123!` — pre-approved driver,
  Kandy Town Taxi Association, Three Wheeler. Backfilled this session (see
  Gotchas above) — fully compliant, `APPROVED`, safe to use.
- `pendingdriver@villageride.lk` / `DriverTest123!` — also backfilled and
  `APPROVED` this session.
- `localtest@villageride.lk` / `TestPassword123!` — customer. Used this
  session to verify the change-password flow round-trip (works).

## Next steps

Nothing is blocking. In priority order, from the original handover's "next
steps" list (still accurate) plus what this session's work opens up:

1. **Driver document re-upload flow.** Right now, if an association rejects
   a document, the driver sees the rejection reason (dashboard doesn't
   surface it yet — only the association's review page does) but there's no
   UI for them to re-upload a corrected version. `saveUploadedFile` and the
   `Document` model both support it trivially; needs a driver-facing action +
   form.
2. **SMS/email OTP provider** — still just logs to console
   (`src/lib/otp.ts`), pluggable via `SMS_PROVIDER_URL`/`RESEND_API_KEY`.
3. **Real payment gateway** (PayHere/Stripe) — schema supports it, nothing
   wired.
4. **Wallet top-up/withdrawal** — read-only today.
5. **Association-level UI for `DriverEligibilityRule`.** The model and its
   per-association override already work (`resolveEligibilityRules`), but
   there's no settings page for an association admin to actually set their
   own thresholds — they can only ever get the global default right now.
   Worth adding alongside the existing pricing-rule settings page as a
   natural next increment.
6. Everything still explicitly out of scope per the original build: heat
   maps, AI features, promo codes, ride sharing, SOS, in-app chat, PWA
   offline, full i18n.

## Open questions

None outstanding. The user's three requests this session (Super Admin login,
password-change UI, Uber/Lyft-style regulated driver system) are all done,
verified, and live.
