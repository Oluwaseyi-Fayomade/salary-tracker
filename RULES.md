# Project Rules

These rules apply to contributors and coding assistants working in this project.

## Code and project structure

- Keep the core app dependency-light and runnable as static files without a build step.
- Use native JavaScript ES modules and existing module boundaries. Do not add a framework, package manager, build system, or dependency without first documenting why it is needed.
- Keep game logic, planner logic, currency handling, cloud operations, and UI rendering in their existing modules.
- Preserve browser-visible hash routes, browser Back/Forward behavior, and mobile layouts when changing navigation or screens.
- Validate user-entered and imported data before saving it. Escape user-provided text before inserting it into HTML.
- Keep changes focused and explain new settings, storage formats, and migrations in the docs.

## Privacy and financial safety

- Never put Supabase service/secret keys, Mono secret keys, or webhook secrets in browser code, HTML, CSS, local storage, or user-visible forms.
- Never ask users to enter bank login credentials. Bank authorization must stay on the provider's hosted consent flow.
- Never add payment initiation, transfers, or account mutation features without a separate product and security review.
- Never claim access to a bank balance, live exchange rate, or financial record that the app has not actually retrieved.
- Label currency conversion and safe-to-spend outputs as estimates based on their source data.
- Do not silently sync, upload, delete, or overwrite financial data. Keep explicit user actions and confirmation before destructive replacement/deletion.
- Keep local-only use available when optional services are unconfigured or unavailable.

## Data integrity and UI

- Do not discard existing saved planner or game data during migration, restore, or refactoring.
- Do not change category IDs or stored data shapes without a backward-compatible migration path.
- Keep budget priorities editable and do not silently rebalance user-set allocations.
- Avoid judgmental, shaming, or guaranteed-outcome language.
- Do not claim tests, provider connections, hosting, or deployment succeeded unless verified.
- Keep bank linking off unless the owner explicitly sets `MONO_ENABLED=true` after Mono and privacy setup; enforce this on the server, not only in the UI.
- Treat restore/import as transactions: validate the complete incoming dataset before writes and roll back partial local commits.
- Make local deletion and remote cloud/account deletion distinct and explain the scope before confirmation.
- Keep `privacy.html` marked as a draft until the real operator identity, contact, hosting region, retention details, and review are supplied.
