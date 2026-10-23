# Product Requirements — Salary Survival

## Product

Salary Survival is a browser-based monthly budget planner for people who want a practical way to plan their pay, track spending, and understand whether they are staying within their budgets. A salary-survival decision game is included as an optional companion experience.

## Audience

- People paid in Nigeria, including people whose salary is paid in a foreign currency.
- People who want to set their own spending priorities and monitor a monthly plan without connecting a bank.
- Casual players who want to explore everyday money trade-offs through a short game.

## User needs

- Set monthly take-home income and the next payday.
- Decide how much to allocate to expense categories and which categories matter most.
- Record purchases manually or import a bank CSV, then correct or remove entries.
- See category budget alerts and a daily flexible-spending guide based on the information entered.
- Keep a local backup or explicitly save/load a cloud copy.
- Optionally convert a foreign-currency salary to an estimated Naira amount using the displayed rate date.

## Product requirements

1. The monthly planner is available independently of the game.
2. Budgets and priorities are user-controlled; any suggested starting allocation remains editable.
3. The spending guide must be described as an estimate based on entered budgets and transactions. It must not imply knowledge of a user's actual bank balance.
4. Data is stored locally by default. Backup restore and cloud-load actions must clearly warn that local data can be replaced.
5. Cloud backup is user-initiated and scoped to the authenticated user.
6. Bank transaction access is optional, consent-based, read-only, and requires an external provider setup. The product must not initiate payments or request bank credentials directly.
7. The game remains optional and must not prevent access to planning features.
8. Browser-visible routes and browser Back/Forward navigation should work on static hosting.

## Non-goals

- Financial advice, guaranteed savings, or guaranteed exchange rates.
- Reading bank balances or transactions before explicit user authorization and provider setup.
- Making transfers, payments, or changes to a financial account.
- Automatic cloud synchronization without an explicit user action.
- Requiring an account for local planning, CSV import, or local backups.

## Success criteria

- A user can make and save a monthly plan without starting the game or creating an account.
- A user can record or import spending and see its effect on category budgets.
- A user can leave and return to the app without losing saved local progress.
- The app clearly communicates when an optional integration is not configured.
