# Salary Survival 🇳🇬

A dependency-free browser game about making it to payday. The static app is split into:

- `src/events.js` — 45 modular events and their trade-off choices.
- `src/game.js` — game state, salary plan, effects, scoring, persistence, and local leaderboard.
- `src/main.js` — screen rendering and browser interactions.
- `styles.css` — responsive visual system and mobile layouts.

## Run locally

Serve this folder over HTTP (ES modules need a local web server):

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/` from this directory. The game needs no build step, package install, or backend. You can deploy the folder to any static host.

Saves, exchange-rate cache, spending log, and leaderboard entries live in the browser's local storage. During setup, users can mark each budget category as **Protect first**, **Keep if possible**, or **Can reduce**, and adjust its planned amount. During the month, they can manually log purchases by category and see 80% and over-budget alerts against those plans. This tracker does not connect to a bank or import transactions. The home screen offers a JSON backup download and restore flow to move an in-progress game, spending log, and local leaderboard between browsers or devices. Result sharing uses the native share sheet when supported and clipboard copy otherwise.

The home screen shows a daily USD-to-NGN reference rate and has a **Refresh rate** button; the salary screen also supports currencies returned by ExchangeRate-API's open daily feed. The app converts the chosen amount in the browser using the feed's latest USD-based rates and shows the quote timestamp. Refresh checks for a newer published quote; it cannot force the upstream feed to publish a new rate sooner. The free feed refreshes about once per day; an estimate may differ from a payroll, bank, or transfer provider rate. If offline, a previously cached rate is marked as such. The API is attributed in the UI as required by its [open endpoint terms](https://www.exchangerate-api.com/docs/free). Only the currency-rate table is requested; the entered salary amount remains in the browser.
