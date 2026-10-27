# Tasks

Work through one small task at a time. Mark a task done only after the stated completion check is met. Put newly discovered work under the appropriate section.

## Current product work

- [x] Maintain a standalone monthly planner with income, payday, editable category budgets, and priorities.
- [x] Show category spending progress and budget alerts from entered transactions.
- [x] Support manual transactions, CSV import, edits, and removal.
- [x] Provide a daily flexible-spending estimate and clearly describe its limits.
- [x] Add local JSON backup and restore for app data.
- [x] Add user-controlled Supabase snapshot code and account-scoped database policies.
- [x] Add optional consent-based Mono linking and transaction import backend code.
- [x] Add browser-visible screen routes and Back/Forward navigation.
- [x] Document the product, architecture, design, rules, tasks, and current progress.
- [x] Harden the static deployment, Supabase Edge Functions, browser data validation, and add security regression checks.

## Owner setup before launch

- [ ] Choose a production static host and publish the app over HTTPS.
- [ ] Create/configure the Supabase project, run both migrations in order, enable email sign-in, set exact allowed origins, and deploy Edge Functions.
- [ ] Configure required Supabase function secrets and validate cloud backup behavior with a test account.
- [ ] Create/configure a Mono developer account, webhook URL, and secrets before enabling bank links for users.
- [ ] Review privacy, retention, consent copy, and provider terms before production use.
- [ ] Run a full browser walkthrough of onboarding, planning, spending entry/import, backups, and mobile layouts before release.

## Backlog

- [ ] Add user-requested month rollover and transaction history across months.
- [ ] Consider recurring bills and reminders after validating the basic monthly workflow with users.
- [x] Add maintained automated security regression checks and a CI workflow.

## Reliability and privacy fixes

- [x] Bound spending totals to the current pay cycle and retain earlier transactions as history.
- [x] Preserve original income currency and rate in the monthly planner.
- [x] Preview CSV entries before import, deduplicate rows, treat signed negative amounts as debits, skip explicit credits, and reject missing/invalid dates.
- [x] Validate local and cloud restores before committing; roll back partial local writes.
- [x] Add local data deletion, cloud snapshot deletion, and authenticated cloud-account deletion with Mono unlink first.
- [x] Gate Mono link/import features behind a server-side disabled-by-default setting.
- [x] Add a draft privacy/data notice with deployment-owner fields clearly marked.
- [ ] Replace privacy notice placeholders and verify hosting/provider retention details before public launch.
- [ ] Deploy and verify the account-deletion Edge Function in the production Supabase project.
