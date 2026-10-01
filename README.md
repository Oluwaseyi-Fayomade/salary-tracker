# Salary Survival 🇳🇬

A browser-based monthly budgeting planner and game about making it to payday. The core app needs no build step or package install. Its static files are split into:

- `src/events.js` — 45 modular events and their trade-off choices.
- `src/game.js` — game state, salary plan, effects, scoring, persistence, and local leaderboard.
- `src/main.js` — screen rendering and browser interactions.
- `src/planner.js` — standalone monthly plan, spending ledger, CSV import, and daily guide.
- `src/cloud.js` — optional Supabase sign-in and user-controlled cloud backup.
- `styles.css` — responsive visual system and mobile layouts.
- `supabase/` — SQL migration and optional Mono bank-link Edge Functions.

## Run locally

Serve this folder over HTTP (ES modules need a local web server):

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/` from this directory. The game needs no build step, package install, or backend. You can deploy the folder to any static host.

## Monthly planner and local data

Choose **Open monthly plan** to set income, next payday, category budgets, and priorities without starting the game. The planner calculates a daily flexible-spending guide from the remaining flexible budgets and unallocated income. It is an estimate based on what the user enters; it cannot see cash or balances held by a bank. Log spending manually or import a bank CSV, then edit/remove individual entries and review budget alerts. Data is saved in this browser's local storage. Use **Download my data backup** and the home-screen restore option to move the plan and game progress between devices. Keep a backup somewhere safe.

## Exchange rates

The home screen shows a daily USD-to-NGN reference rate and has a **Refresh rate** button; foreign-currency salaries use the available daily feed. Refresh checks for a newer published quote; it cannot force the provider to publish a new rate sooner. An estimate may differ from an employer, bank, or transfer provider rate. Offline, a cached quote is marked as saved. The app attributes [ExchangeRate-API](https://www.exchangerate-api.com/docs/free). Only the currency-rate table is requested; the salary amount remains in the browser.

## Optional cloud sync setup (site owner)

Cloud sync is implemented, but needs a Supabase project before it can be used:

1. Create a Supabase project and run `supabase/migrations/20261001000100_planner_cloud.sql` in its SQL editor.
2. In Supabase Auth, enable email sign-in and set the deployed site's URL in the redirect allowlist.
3. Deploy the functions in `supabase/functions/` with the Supabase CLI. Set the project's publishable key and URL in the planner's **Use your account on another device** panel. Never put a Supabase secret/service key in the website.
4. Users explicitly choose when to save or load a cloud copy. Cloud data is scoped to the signed-in user's account; it is not automatic sync.

The planner dynamically loads the Supabase JS client from `https://esm.sh` only after the user configures cloud settings. The static planner and local backups do not require Supabase.

## Optional Mono bank connection (site owner)

Bank linking is also implemented, but it is not live until the site owner has a Mono developer account and deploys/configures the backend. Deploy all functions under `supabase/functions/`. Configure these server-side secrets in Supabase: `MONO_SEC_KEY`, `MONO_WEBHOOK_SECRET`, and `APP_URL` (the deployed site origin). In Mono, register `https://YOUR_SUPABASE_PROJECT.functions.supabase.co/mono-webhook` as the webhook endpoint and use the same webhook secret. Do not put Mono secrets in browser code or the UI.

After setup, a signed-in user must check the consent box, then choose a bank and authorize access on Mono's hosted screen. The app can import transactions and the user can correct categories; it does not initiate payments. Disconnecting revokes the bank link. CSV import works without any bank or cloud account.

## Hosting

The static app can be deployed to any static host. Screens have browser-visible hash routes, such as `/#/planner`, `/#/salary`, and `/#/game`; browser Back and Forward navigate between screens. Hash routes keep refreshes compatible with simple static hosts. Cloud sync and bank-link features require the separate Supabase setup above. Local development: serve this folder over HTTP with `python3 -m http.server 8000`, then open `http://localhost:8000/`.
