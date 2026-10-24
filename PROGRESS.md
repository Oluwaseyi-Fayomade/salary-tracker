# Progress

Last updated: 2026-10-23

## Done

- Built the static Salary Survival game and a standalone monthly budgeting planner.
- Added category budgets and priorities, manual transaction logging, CSV import, editable/removable entries, budget alerts, and a daily spending guide.
- Added foreign-currency salary conversion using a published daily rate feed, with a refresh control and cached-rate indication.
- Added local storage, JSON backup/restore, and optional explicit Supabase snapshot operations.
- Added optional Mono bank-link and transaction-import Edge Function code with explicit consent and server-side secret requirements.
- Added a visible home control, direct brand link, and hash routes for app screens; the planner route renders at `#/planner` and supports browser Back/Forward.
- Added project requirements, architecture, design, rules, and task documents.

## Known limitations / setup still required

- Core planning and the game store data in the current browser unless the user exports a backup or explicitly configures cloud sync.
- Supabase cloud backup is code-complete but needs a site-owner project, migration, email auth configuration, function deployment, and secrets.
- Mono linking is code-complete but not live until the site owner configures a Mono developer account, webhook, function deployment, and server secrets.
- Exchange rates are references/estimates and may differ from a payroll or transfer provider. Refresh can only retrieve the latest rate the provider has published.
- A static local HTTP server is for development; public hosting and service setup are not yet confirmed.

## Recent fixes

- Declared the saved-game modal state to prevent the initial page renderer from failing.
- Loaded cloud settings inside the planner renderer so opening the planner no longer throws a reference error.
- Removed the redundant planner-heading HOME button, leaving the persistent top-bar HOME control.
- Added static-host-friendly hash routes and browser Back/Forward handling.

## Next

1. Decide whether to publish the app and which host to use.
2. Complete Supabase owner setup if cross-device backup is wanted.
3. Complete Mono setup only if bank transaction import is wanted.
4. Walk through the planner with real sample data and fix any usability issues before inviting users.

## Data integrity and privacy update (2026-10-23)

- Planner spending now uses the active cycle date range and keeps earlier entries as history; the planner can store foreign-currency income plus the rate used.
- CSV parsing preserves signed negative debits, skips explicit credit rows, rejects missing/invalid transaction dates, deduplicates against existing and same-file transactions, and presents all detected rows before import.
- Local backup restore validates the full payload before changing saved data and rolls back failed writes. Cloud restore now validates and commits planner/game together.
- Added browser-local data deletion, cloud-copy deletion, and a Supabase account-deletion function that attempts Mono unlink before deleting the account.
- Mono linking and transaction retrieval remain disabled unless `MONO_ENABLED=true` is set server-side.
- Added `privacy.html` as a draft; owner identity/contact and deployment-specific hosting/retention information remain launch blockers and must be filled in by the operator.
- These changes received static source inspection only. A live Supabase/Mono setup and browser walkthrough have not been verified.
