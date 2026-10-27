# Security review and hardening

**Review date:** 27 October 2026  
**Scope:** checked-in browser app, optional Supabase Edge Functions, database migration, and Netlify static deployment configuration. This is an application-level code review, not a penetration test, provider-account audit, legal opinion, or security certification.

## Data flow and trust boundaries

- The core app runs in the user's browser. Salary, budgets, priorities, game state, spending records, and downloaded backups are stored in browser storage or on a file chosen by the user. They are not encrypted by the app and should be treated as sensitive.
- Cloud sync is opt-in. Authenticated requests save a user's own snapshot to Supabase; row-level security restricts snapshot access to `auth.uid()`. Supabase's publishable key is public by design; the service-role/secret key must remain in Edge Function secrets.
- Mono access is opt-in and requires the user to consent. Supabase Edge Functions make provider requests and store connection metadata. The app imports transactions for budgeting; it does not initiate payments.
- Netlify serves static files. `netlify.toml` copies only the app into `dist/`; `_headers` applies browser security headers.

## Controls implemented

- Restricted CORS to `APP_URL` and exact `APP_ALLOWED_ORIGINS`; no wildcard origin. Localhost is allowed only with explicit `APP_ENV=development`.
- Edge Functions enforce HTTP methods, authenticate user tokens, return generic unexpected-error responses, disable caching for JSON responses, bound request/provider response sizes, and set timeouts on external Mono calls.
- Privileged user operations use an atomic database-backed rate limiter. Its table/function are not available to browser roles. The new migration must be applied before deploying these functions; missing rate-limit infrastructure fails closed.
- Bank-link flow requires explicit consent, blocks replacement of an active connection, limits pending attempts, validates the hosted Mono URL, and checks Mono webhook secrets and payload structure.
- Cloud snapshots have a 2 MiB limit and must be JSON objects. Existing rows are not scanned by the new `NOT VALID` constraints; they are still checked on every future write. Review old rows separately if the project already contains data.
- Browser save/import paths validate financial amounts, constrain CSV and backup sizes, and reject malformed/tampered game saves. User-rendered text is escaped in the UI.
- Static hosting headers set a Content Security Policy, HTTPS upgrade, anti-framing, MIME sniffing protection, referrer policy, and reduced browser permissions.
- Supabase JS is pinned to a specific release. Regression checks run with `npm test`.

## Deploy the hardening

1. Apply `supabase/migrations/20261027000100_security_hardening.sql` after the original planner migration in the Supabase SQL editor. Verify it completes successfully.
2. Deploy every function under `supabase/functions/` so the runtime has the new checks.
3. Set `APP_URL` to the deployed site's exact HTTPS origin. Set `APP_ALLOWED_ORIGINS` only for additional exact origins that you operate (comma-separated, no paths, no wildcard). Set `APP_ENV=development` only in local development.
4. Keep `SUPABASE_SECRET_KEYS`/service-role credentials, `MONO_SEC_KEY`, and `MONO_WEBHOOK_SECRET` in Supabase Edge Function secrets. Never put them in static files or client-side settings.
5. Deploy the Netlify site through the checked-in `netlify.toml` and verify the response headers on the deployed domain. Preview URLs must be explicitly allowlisted if they call the Edge Functions.
6. If migrating a project with existing cloud data, investigate rows that violate the new snapshot size/object constraints before validating those constraints.

## Remaining risks and owner actions

- Browser storage, local backups, and Supabase session tokens accessible to the browser are exposed if the device/profile is compromised or an XSS flaw is introduced. Use a trusted device and protect exported backups. The app cannot make client-provided financial records authoritative.
- The optional cloud and bank features are not safe to enable until the database migration, functions, secrets, allowed origins, provider webhook, provider account settings, and privacy disclosures have all been configured and checked in the real project.
- The repository cannot verify Supabase Auth settings, MFA policy, redirect allowlist, email/OTP limits, project region, backups, logs/retention, network restrictions, Mono account/webhook configuration, or Netlify domain/DNS/deployed headers. The project owner must verify these in provider dashboards.
- The draft privacy notice still has operator identity/contact placeholders. Replace them and complete applicable privacy review before public launch.
- There is no server-authoritative transaction ledger or independent anomaly monitoring/incident-response process. Rate limits are per user and fixed-window; distributed abuse and provider-level protections remain operational concerns.
- Provider failures and browser extensions/devtools are outside the code's control. Never treat the planner or imported data as verified account balances.

## Verification

Run `npm test` with Node.js 20 or newer. The checks cover planner/game input bounds, backup/save handling, migration permissions, CSP directives, bank-link safeguards, and the home/planner UX safeguards. They are regression tests, not exhaustive security testing. Before launch, review against [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) and the [OWASP API Security Top 10](https://owasp.org/API-Security/).
