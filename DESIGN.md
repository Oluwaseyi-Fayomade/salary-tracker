# Design — Salary Survival

## Visual direction

Friendly, confident Nigerian personal-finance utility with a playful game layer. The planner should feel calm and legible; game moments may be more expressive. Avoid bank-dashboard intimidation and avoid treating a budget miss as a moral failure.

## Colors

Current CSS tokens in `styles.css`:

| Token | Value | Use |
|---|---|---|
| `--green` | `#0e3b35` | Primary brand and dark panels |
| `--green2` | `#14574c` | Secondary green |
| `--lime` | `#d8fa70` | Accent and primary highlights |
| `--paper` | `#f6f5ef` | Page background |
| `--ink` | `#162b26` | Main text |
| `--muted` | `#78837e` | Supporting text |
| `--line` | `#e4e8e1` | Borders and dividers |
| `--coral` | `#fa8068` | Over-budget/error emphasis |
| `--gold` | `#e9b84e` | Secondary highlight |

## Typography

- `Space Grotesk` for display headings and prominent brand text.
- `DM Sans` for body copy, forms, and controls.
- Fonts are currently loaded from Google Fonts; preserve readable system fallbacks if the remote font is unavailable.

## Components and behavior

- Persistent top bar with brand/home link and location-aware HOME button.
- Salary and category budget forms, priority selectors, spending progress bars, and alert copy.
- Standalone monthly planner with safe-to-spend card, editable category allocations, manual ledger, CSV import, and backup controls.
- Optional cloud and bank setup inside a disclosure panel to keep advanced setup out of the main planning flow.
- Use visible focus states, accessible labels, responsive layouts, and clear disabled states.

## Content tone

Use plain, supportive language. Explain estimates and setup requirements next to the feature that needs them. Never shame users for spending or imply that an estimate is a guarantee.
