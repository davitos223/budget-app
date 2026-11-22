# Architecture

How Budget is put together, what the numbers mean, and what must keep working. Written from the code as of version 20261122g.

## Pieces

| Part | Where | What it does |
|---|---|---|
| App | `docs/index.html` | Screens and forms in one page. No build step. |
| Calculations | `docs/calculations.js` | Shared money, recurrence and date logic used by the screens. |
| Sync | `docs/cloud.js` | Firebase sign-in and live sync with an offline cache. Exposes `window.Cloud`. |
| Config | `docs/config.js` | Which Firebase project to use (`null` = demo mode). |
| Offline | `docs/sw.js` | Service worker: newest version first, saved copy when offline or slow. |
| Access rules | `firestore.rules` | The real security. Checked by Google's servers on every read and write. |
| Hosting | GitHub Pages | Serves `docs/` from `main`. A push updates the app within minutes. |
| Login and data | Firebase project `budget-600b6` | Email and password logins (sign-up off), Firestore in `eur3`. |

There is no server of our own. The app talks to Firebase directly, and the rules decide what each login may touch.

The app also has a **demo store** (`makeLocalStore`) with exactly the same interface as `Cloud`, kept in the browser. It's used when there's no config, and for `?demo` on localhost, the tests and the screenshots.

## Data

```
users/{uid}                     name, look { theme, accent, size, start, hideOnStart, billSort }
budgets/{bid}                   name, emoji, kind "personal"|"shared", owner, members [uid], memberNames {uid: name},
                                currency, numStyle "dot"|"comma"|"space", carry, categories [...], limits {catId: amount}
budgets/{bid}/entries/{id}      type "income"|"bill"|"spend", name, amount, category, repeat, start "YYYY-MM",
                                until "YYYY-MM"|null, due 1–31|null, auto, note, by uid, createdAt, updatedAt
budgets/{bid}/months/{YYYY-MM}  paid {entryId: bool}, amounts {entryId: number}, skip {entryId: true}, note
budgets/{bid}/activity/{id}     at (ms), by uid, k (kind), n (name), a (amount), t (type), m (month), x (extra words) — add-only
budgets/{bid}/goals/{id}        name, emoji, target, by "YYYY-MM"|null, color, moves [{ k, d "YYYY-MM-DD", a ±amount, by uid }], createdAt
```

- **Amounts** are stored as numbers in the budget's currency with at most two decimals. They are parsed by `num()`, which follows the budget's number style, so "1.000" means one thousand in the default style.
- **All arithmetic is done in whole cents** (`sum`, `cents`, `r2`). There's no `0.1 + 0.2 = 0.30000000000000004`.
- **An entry is a rule, not a copy per month.** "Every month from 2026-01 until 2026-06" is one document. Each month's view is worked out from the rules (`occurs`).
- **Per-month facts live in `months/{YYYY-MM}`**: which bills are ticked, one-month amounts and skips. The rule itself never changes for one month.
- **Who did what:** entries and savings moves keep `by` (the uid). Shared budgets show names from `memberNames`.
- **Dates:** `start` and `due` are the money's own date. `createdAt` and `updatedAt` record when it was typed in.

## The numbers (one engine, used by every screen)

| Function | Meaning |
|---|---|
| `occurs(e, m)` | Does rule `e` fall in month `m`? (start, until, and every 1/2/3/6/12 months keeping the start's rhythm) |
| `monthItems(m)` | Every entry in month `m` with its amount for that month, skipped flag and paid flag |
| `autoPaid` | Autopay bills count as paid from their due day. Past months are paid, future ones aren't. A manual untick wins. |
| `totals(m)` | income, bills, unpaid, spend, saved (net savings moves), carry, **afterBills = income + carry − bills**, **left = afterBills − spend − saved**, out = bills + spend |
| `carryIn(m)` | With carry-over on: the sum of every earlier month's left, back to the first month with data (20 years at most) |
| `safeToSpend(m)` | This month only: max(0, left) ÷ days left including today |
| `limitsFor(m)` | Each limited category: limit, used (bills + spending, paid or not), done (the paid part) |
| `forecast(m)` | This month only: left − likely further spending (usual monthly spending of the last 3 months minus what's spent so far; with no history, this month's daily pace × days left) |
| `insights(m)` | Up to 5 observations, first the month-end forecast (this month), then: biggest category rise and fall vs last month (≥ €20 and ≥ 10%), total going out ±5% or more, saved ≥ €20 more, limits at 80%+ or over, the biggest cost |
| `billsPlan(year)` | Every bill in a calendar year: count, months, total (one-month changes and skips included) |
| `perMonth(total, from, by)` | Monthly amount from `from` to `by` (both included), rounded UP to the cent so it is enough |
| `backfillStart(e, from)` | For *Fill in earlier months*: the first month on or after `from` that keeps the item's rhythm |

Rules that are easy to get wrong:

- **Skipped** items count nowhere. **Changed-for-one-month** amounts replace the normal amount in that month only.
- **Unpaid bills still count** in "left after bills". The money is spoken for. "Still to pay" shows how much of it hasn't gone yet.
- **Savings moves reduce what's left in their month.** Taking money out of a goal adds it back.
- The Year view only compares with the previous year when there's data from that January. A partial first year would give silly percentages.

## Who can do what (`firestore.rules`)

- Nothing works without a login, and sign-up is turned off in Firebase. Logins are added by the project owner.
- `users/{uid}` can only be read and written by that login.
- A budget can only be read by people in its `members` list, and the same goes for everything inside it.
- Creating a budget: you must be the owner and the only member, and the kind must be personal or shared.
- **Personal budgets can never get other members.**
- The owner can change anything, but can't hand away ownership, remove themselves or change the kind. Members can edit names, currency, categories and limits, but never owner, members or kind. A member may remove only themselves.
- **Activity** (`budgets/{bid}/activity`): members may read it and add records as themselves (`by` must be their uid, `at` an integer, `k` a string). Nobody can change or delete a record, except the owner when deleting the whole budget.
- Only the owner can delete a budget. The app deletes the inner documents first, because Firestore doesn't do that by itself.
- The browser API key only works from `davitos223.github.io`, `localhost:5174` and `budget-600b6.firebaseapp.com`.

Checked from outside on 2026-11-22: reads without a login give `PERMISSION_DENIED`, sign-up gives `ADMIN_ONLY_OPERATION`, and other websites are blocked.

## Tests

- `node tools/test.mjs`: browser checks on a demo copy. They cover calculations, recurrence, per-date bill ticks, offline updates, and backup and restore. **Run it before every release.**
- `node tools/screenshots.mjs`: remakes the README pictures from invented demo data.
- Still to do: automated tests of `firestore.rules` on the Firebase emulator (needs Java 21).

## Must keep working

- Old data must keep loading. Fields have only been added, never renamed: `due` for income and spending, `limits`, `carry`.
- Bump the version in three places together: `APP_VERSION`, the `?v=` on the script tags, and `version:` in `cloud.js`.
- Never put real data in the repo, the screenshots or the tests.
