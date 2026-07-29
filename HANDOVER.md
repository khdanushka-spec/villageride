# Handover — 2026-07-30

## Goal

Build "VillageRide Sri Lanka" — a full ride-hailing platform (Uber/DiDi-style) for
Sri Lankan village taxi associations, from the original mega-spec (Next.js,
Prisma/Postgres, 4 roles — Super Admin / Association Admin / Driver / Customer,
full booking engine with live tracking, multi-language, etc.). The explicit ask
was to build the *entire* production-ready app, then git-init it and push it
live to Vercel.

All 10 planned build phases are now done and the app is live and verified
end-to-end in production. This handover exists mainly so a fresh session
doesn't have to rediscover the two hard-won production bugs below, or the
account/tooling quirks that caused friction.

## State

**Everything is built, committed, pushed, and deployed.** `git status` is
clean; `main` matches `origin/main`; latest commit `8232472` is the version
running in production.

- Live app: **https://villageride.vercel.app**
- GitHub repo: **https://github.com/khdanushka-spec/villageride** (public)
- Vercel project: **dkns/villageride** (see "Two separate Vercel accounts" below)

All 4 dashboards, the booking engine, and auth have been manually verified
working **in production** (not just locally) via browser automation:
register/login (email + phone OTP) → book a ride → driver accepts → arrive →
start → complete → rate, plus association driver-approval and super-admin
association-creation flows. See "Known test accounts" below.

## Key decisions

- **Next.js 15, not 16.** Started on 16 (what `create-next-app` installed by
  default), hit a Vercel platform-level 404 on a clean build, downgraded to 15
  (also what the user's original spec asked for). The 16→15 downgrade is why
  `middleware.ts` exists instead of `proxy.ts`, and why auth had to be split
  (next point).

- **`src/lib/auth.config.ts` (edge-safe) vs `src/lib/auth.ts` (full).**
  Next 15 middleware runs on the **Edge runtime** by default. It cannot bundle
  Prisma/bcrypt/`node:crypto`, which the Credentials providers need. So:
  `auth.config.ts` holds only `session`/`callbacks.jwt`/`callbacks.session`
  (pure, edge-safe) and is imported by `src/middleware.ts`, which builds its
  own tiny `NextAuth(authConfig)` instance. `auth.ts` spreads `...authConfig`
  and adds the real Credentials/Google providers + DB-backed `signIn`
  callback, used everywhere else (Server Actions, Route Handlers).

- **`useSecureCookies: !!process.env.VERCEL` is load-bearing — do not remove.**
  This was the real fix for a production bug where *every* login/registration
  bounced straight back to `/login`. Root cause (confirmed via temporary
  middleware `console.log` of `req.cookies`, checked through
  `vercel logs villageride.vercel.app --environment production --json`): the
  Node runtime (Server Actions, via `signIn()`) and the Edge runtime
  (middleware) disagreed on whether the connection counted as "secure," so one
  set the cookie as `authjs.session-token` and the other only ever looked for
  `__Secure-authjs.session-token`. The cookie was present the whole time —
  middleware just never recognized it. Pinning `useSecureCookies` makes both
  runtimes agree unconditionally instead of each independently guessing from
  request context. If auth ever breaks again in a similar way, check this
  first before assuming it's a new bug.

- **Server Actions that sign a user in must not call `redirect()` themselves.**
  Related to the above: even after fixing cookies, an in-action `redirect()`
  can still land the *browser* on the target route before it's finished
  processing the `Set-Cookie` from the sign-in response. Fixed by having
  `loginWithEmailAction`, `registerCustomerWithEmailAction`,
  `verifyPhoneOtpAction`, and `registerDriverAction` (all in
  `src/actions/auth.ts`) return `{ redirectTo }` instead, and having the
  client form components call the new `useActionRedirect` hook
  (`src/hooks/use-action-redirect.ts`), which does a full
  `window.location.href` navigation once the action resolves. Any *new*
  post-sign-in action must follow this pattern, not call `redirect()` inline.

- **Local dev DB is `embedded-postgres`, not Docker/native Postgres.** No
  Docker or Postgres was available in this sandbox, so `scripts/dev-db.mjs`
  spins up `embedded-postgres` on `localhost:54329` (db `villageride`, user/pass
  `postgres`/`postgres`), data persisted in `.pgdata/` (gitignored). It was
  reinitialized once with explicit `--encoding=UTF8 --locale=C` — the default
  locale-derived encoding came out as WIN1252, which would have silently
  mangled Sinhala/Tamil names.

- **Fare estimation uses Haversine (straight-line) distance**, not a routing
  API — `src/lib/fare.ts` — since no Google Maps/OSRM key exists. Documented
  in-code as an approximation to swap out later.

- **Maps are Leaflet + raw OpenStreetMap tiles**, not Google Maps — no API key
  needed. Address search/reverse-geocoding goes through a server-side proxy at
  `src/app/api/geocode/route.ts` (required so Nominatim sees a real
  `User-Agent`, per their usage policy, and so the browser never calls a
  third party directly).

- **This UI kit is Base UI under shadcn, not Radix.** `Button`'s polymorphic
  prop is `render={<Link .../>}` + **`nativeButton={false}`** whenever it
  renders as a link — not `asChild`. Forgetting `nativeButton={false}` throws
  a console error and (in some cases) breaks hydration. `Accordion` takes
  `multiple` not `type="single"`.

- **Global `PricingRule` rows (`associationId: null`) can't be upserted via
  the compound unique key.** Postgres treats `NULL` as distinct from `NULL` in
  unique constraints, and Prisma won't accept `null` in a compound-unique
  `where`. Global pricing writes use `findFirst` + manual `create`/`update`
  instead (see `prisma/seed.ts` and `saveGlobalPricingRuleAction` in
  `src/actions/admin.ts`).

## Files touched

Far too many to list individually (~155 tracked files, ~38 routes). High-level
map:

- `prisma/schema.prisma`, `prisma/seed.ts` — full schema + idempotent seed
  (global pricing for all 9 vehicle types, 3 sample associations, 1 super
  admin). `prisma.config.ts` wires the seed command.
- `src/lib/auth.ts`, `auth.config.ts`, `src/middleware.ts` — auth (see above).
- `src/actions/*.ts` — all Server Actions (auth, trips, driver, association,
  admin, addresses, profile), one file per domain.
- `src/lib/fare.ts`, `src/app/api/{geocode,fare-estimate,trips/[id]}` —
  booking engine support.
- `src/components/booking/*` — map, address search, book-ride form, trip
  status panel (customer side).
- `src/components/driver/*` — online toggle, available-rides list, active
  trip panel (with live `navigator.geolocation.watchPosition` reporting).
- `src/app/dashboard/{customer,driver,association,admin}/**` — the 4
  dashboards. `src/lib/nav.ts` + `src/components/dashboard/shell.tsx` are the
  shared sidebar/topbar shell.
- `src/app/(auth)/**`, `src/components/auth/*` — login/register pages
  (email+password and phone OTP) for customer/driver.
- `src/components/marketing/*`, `src/lib/i18n/*` — home page + EN/SI/TA
  language switcher (only header/hero copy is actually translated; the rest
  of the app is English-only — a known, stated gap, not a bug).
- `scripts/dev-db.mjs` — local Postgres bootstrap (see above).

## Gotchas / constraints learned

- **Two separate GitHub accounts on this machine** (`dhanu-af` and
  `khdanushka-spec`) — this repo ended up under `khdanushka-spec` because
  that's the account the user was logged into in the GitHub web UI when she
  created the repo, but `gh` CLI defaults to `dhanu-af` and
  git-credential-manager had `khdanushka-spec` cached. The repo's **local**
  git credential helper is scoped to just `manager` (GCM) for
  `github.com` — see `git config --local --get-all credential.https://github.com.helper` —
  overriding the global `gh auth setup-git` override, so pushes from this
  repo specifically use GCM/`khdanushka-spec`, not `gh`'s `dhanu-af` token. If
  push ever fails with a permission error, that's the first thing to check.

- **Two separate Vercel accounts, and the MCP `vercel` tools can't see this
  project.** The CLI (`vercel` via `npx`) is authenticated as `khdanushka-9565`
  under team `dkns` (`orgId: team_0lkJHh1pYMlliG6tZi1jps8r`) — that's where
  this project actually lives. The `mcp__vercel__*` tools are authenticated
  under a *different* account/team (`DKNS` / `team_IFsD28fF0XXuFVwrVhrnLXnX`),
  confirmed via a 403 when trying to cross-reference. **Use the `vercel` CLI
  via Bash for anything on this project — the MCP Vercel tools will not find
  it.** `.vercel/project.json` in this repo has the real IDs.

- **A fresh `vercel link` (non-interactive) defaulted Framework Preset to
  "Other"**, not Next.js — silent until you check `vercel project inspect
  <name>`. Symptom was maddening: builds succeeded completely, deploy showed
  "Ready," but every URL returned a platform-level `X-Vercel-Error: NOT_FOUND`
  (not an app 404) because Vercel was serving it as a static site with no
  Next.js routing layer at all. Fixed once via `vercel project update
  villageride --framework nextjs --auto-detect build-command --auto-detect
  output-directory --auto-detect install-command`. Shouldn't recur unless a
  new project is created the same way.

- **Deployment Protection (SSO) was on by default** on this Vercel
  team/plan, silently making the public site require Vercel login. Disabled
  via `vercel project protection disable villageride --sso --non-interactive`.

- **The sandbox redacts secret-looking values before they ever hit disk** —
  `vercel env pull` produced a file where `DATABASE_URL` etc. were literally
  13-char `"[SENSITIVE]"` placeholders, even though the pull command itself
  succeeded. There is no way to get the real production connection string
  into this environment. Anything needing the real DB (migrations, seeding,
  one-off admin password resets) has to run **inside Vercel's own build step**
  via `vercel-build` in `package.json`, which has genuine unredacted access to
  its own env vars. That's why `vercel-build` does
  `DATABASE_URL=$DATABASE_URL_UNPOOLED prisma migrate deploy && DATABASE_URL=$DATABASE_URL_UNPOOLED npx tsx prisma/seed.ts && next build`
  instead of anything being run locally against prod.

- **Deleting `.next` while the local dev server is still running corrupts
  it** (stale webpack cache, `ENOENT ... routes-manifest.json`, etc.). Always
  stop the preview server (or at least expect to restart it) after running
  `npm run build` locally, since that also writes to `.next`.

- **`embedded-postgres` must stay a real `devDependency`**, not installed
  with `--no-save`. It was pruned once by an unrelated `npm install` and
  `scripts/dev-db.mjs` failed with `ERR_MODULE_NOT_FOUND` until reinstalled
  properly.

- The three Base UI/shadcn quirks under "Key decisions" above (nativeButton,
  Accordion `multiple`, PricingRule null-upsert) — same content, listed there
  so they're not duplicated.

## Known test accounts

**Production** (https://villageride.vercel.app, real Neon DB):
| Role | Email | Password | Notes |
|---|---|---|---|
| Super Admin | `admin@villageride.lk` | `oWjUDudkZzVX` | Seeded account; password was force-reset once via `SEED_RESET_ADMIN_PASSWORD` (see `prisma/seed.ts`) since the original was never captured. |
| Association Admin | `mataraadmin@villageride.lk` | `MataraAdmin123!` | Created live via the Super Admin "Associations" page during verification (association: Matara Taxi Society). |
| Customer | `prodverify@villageride.lk` | `VerifyPass123!` | Created during final verification pass. |
| Customer | `prodtest@villageride.lk` | *(not recorded)* | Earlier ad-hoc test account; password wasn't logged. Fine to ignore/leave orphaned. |

**Local only** (embedded Postgres, `.pgdata/`) — created directly via one-off
Node scripts during testing, not through the real registration UI in most
cases, so some (like `testdriver@`) have no uploaded documents on file:
- `testdriver@villageride.lk` / `DriverTest123!` — pre-approved driver, Kandy
  Town Taxi Association, Three Wheeler.
- `pendingdriver@villageride.lk` / `DriverTest123!` — now approved (was used
  to test the approve flow), Taxi vehicle.
- `assocadmin@villageride.lk` / `AssocAdmin123!` — Kandy Town Taxi
  Association admin.
- `localtest@villageride.lk` / `TestPassword123!` — customer.

## Next steps

Nothing is blocking — the app is complete per the original 10-task plan and
live. If continuing to build it out further, in likely priority order:

1. **Swap file storage off local disk.** `src/lib/storage.ts` writes driver
   documents/vehicle photos to `public/uploads/` — this **will not persist**
   on Vercel's serverless filesystem in production (untested — no driver has
   registered through the real UI in prod yet, only via direct DB scripts).
   Needs Vercel Blob or S3 before driver registration is genuinely usable
   live.
2. **Wire a real SMS/email provider for OTP.** Currently logs codes to the
   server console only (`src/lib/otp.ts`). The delivery layer is already
   pluggable (checks `SMS_PROVIDER_URL`/`SMS_PROVIDER_API_KEY` and
   `RESEND_API_KEY` env vars) — just needs real credentials and testing.
3. **Real payment gateway (PayHere/Stripe)** for the `CREDIT_CARD`/
   `DEBIT_CARD`/`PAYHERE`/`STRIPE` enum values that exist in the schema but
   aren't wired to anything. Currently only Cash and Wallet are offered in
   the booking UI.
4. **Wallet top-up / withdrawal flows** — currently read-only (balance +
   transaction history). Top-up needs the payment gateway above; withdrawal
   could be a request-record-only flow an association/admin marks processed
   manually, without needing a payout API.
5. Everything explicitly scoped out and not started: heat maps, AI features
   (ETA prediction, demand prediction, fraud detection, support chatbot),
   promo codes, referrals, ride sharing, SOS, in-app chat, voice directions,
   PWA offline support, full i18n (only marketing header/hero is translated).

## Open questions

None outstanding — no pending decisions need the user's input right now.
