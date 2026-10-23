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

## Owner setup before launch

- [ ] Choose a production static host and publish the app over HTTPS.
- [ ] Create/configure the Supabase project, run the migration, enable email sign-in, and deploy Edge Functions.
- [ ] Configure required Supabase function secrets and validate cloud backup behavior with a test account.
- [ ] Create/configure a Mono developer account, webhook URL, and secrets before enabling bank links for users.
- [ ] Review privacy, retention, consent copy, and provider terms before production use.
- [ ] Run a full browser walkthrough of onboarding, planning, spending entry/import, backups, and mobile layouts before release.

## Backlog

- [ ] Add user-requested month rollover and transaction history across months.
- [ ] Consider recurring bills and reminders after validating the basic monthly workflow with users.
- [ ] Add automated checks only when a test workflow is introduced and maintained.
