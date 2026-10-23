# Architecture — Salary Survival

## Stack

- Static HTML and CSS with native JavaScript ES modules; no build step or package installation for the core app.
- Browser `localStorage` for game progress, planner data, currency-rate cache, and leaderboard.
- ExchangeRate-API open daily feed for reference currency rates.
- Optional Supabase Auth, Postgres, and Edge Functions for user-controlled cloud backups and Mono server integration.
- Optional Mono API integration for consent-based bank transaction import.

## Project layout

```text
index.html                 App shell and module entry point
styles.css                 Layout, typography, colors, and responsive styling
src/
  main.js                  Screen rendering, routes, and UI event handlers
  game.js                  Game state, categories, scoring, and local persistence
  events.js                Game event data and choices
  planner.js               Monthly plan, transaction validation, CSV parsing, daily guide
  currency.js              Currency feed, caching, refresh, and conversion helpers
  cloud.js                 Optional Supabase client and authenticated operations
supabase/
  config.toml              Supabase function configuration
  migrations/              Tables and row-level security policies
  functions/               Authenticated Mono integration and webhook handlers
```

## Navigation and data flow

1. `index.html` loads `src/main.js` as a browser ES module. Serve the folder over HTTP; opening the HTML file directly is unsupported.
2. `main.js` maps screens to hash routes such as `#/planner`. History entries drive browser Back/Forward. On screen entry, the renderer loads data through the relevant module.
3. `planner.js` validates and normalizes the monthly plan and writes it to local storage. `main.js` renders that state and adds/removes/imports transactions.
4. `currency.js` fetches and caches the provider's published rates. Salary conversion occurs in the browser; the entered salary amount is not sent to the rate provider.
5. `cloud.js` initializes the Supabase JS client only when the user supplies project settings. Users explicitly sign in and save/load/delete snapshots.
6. Mono credentials remain in Supabase server secrets. Edge Functions authenticate the user, start a consented link, process webhooks, import transactions, and disconnect the account.

## Persistence boundaries

- Local planner and game state are independent of Supabase and Mono.
- Cloud snapshots belong to the authenticated Supabase user and are only written/read on user action.
- Imported bank transactions are copied into the user's local planner after import and may then be backed up to the cloud if the user chooses.
- The browser does not hold a Supabase service secret or Mono secret.

## Hosting

The core app can be served from a static host. Hash routing avoids needing server-side route rewrites. Supabase and Mono integrations need separate backend deployment and owner credentials; they are not activated by static hosting alone.
