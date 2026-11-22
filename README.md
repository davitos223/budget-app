# Budget

A private budgeting web app for the phone and PC: income, bills, spending and what's left. It's built the same way as Charge Log: a GitHub Pages web app that can be installed on a phone, with Firebase login and sync.

## Privacy model

- **Logins only.** Email and password, with **public sign-up turned off**. Nobody can make an account; the admin adds each person in the Firebase console.
- **Every budget has a members list**, and the Firestore rules (`firestore.rules`) only allow people on that list to read or write it, including everything inside it. Requests without a login are refused.
- **Each person gets their own private budget** the first time they sign in. Its kind is `personal`, and the rules make it impossible to add anyone else to it.
- **Shared budgets** (e.g. "Household") are optional. The owner adds people by pasting their *sharing code* (shown in Settings → Your account). Only the owner can add or remove people or delete the budget, and a member can leave.
- Look settings (theme, colour, text size) are stored per person in `users/{uid}`, and only that person can read them.
- The code is public on GitHub, but **no data ever goes into the repo**. The Firebase config in `docs/config.js` only identifies the project; the rules decide access.
- The project owner can still see data in the Firebase console. This was chosen on purpose over passphrase encryption, so that forgotten passwords can be reset.

## Features

- **Month view:** "Left after bills" in large type, still to pay, what's left after spending and savings, and how much is safe to spend per day for the rest of the month.
- **Repeating items:** add a bill once and choose how often it comes: every month, 2, 3 or 6 months, every year, or just once. Optional last month (e.g. when a loan ends).
- **Tick bills as paid.** Bills marked *Paid automatically* (direct debit) tick themselves on their due day.
- **Overdue / due soon** alerts, plus a warning when planned spending is more than income.
- **Just this month:** change a repeating bill's amount or skip it for one month. "Stop from … on" keeps the history.
- **Spending** (one-off purchases), **notes** per month, and **where it goes**: a breakdown by category.
- **Year view:** income vs. bills and spending bar chart (no line charts), year totals, average left per month, best month, totals by category and the biggest bills. Tap a month to open it.
- **Savings goals:** target and optional "reach it by" date, with "put aside X a month" worked out for you. Money put in or taken out counts in that month's budget, and each goal keeps its history.
- **Carry over:** optionally, each month's leftover rolls into the next month.
- **Customisation (per person):** Auto/Light/Dark theme, 7 accent colours, 3 text sizes, which tab opens first, bill order (due date, unpaid first, amount, name), and an option to hide amounts on start. 👁 blurs all amounts at any time.
- **Customisation (per budget):** name and emoji icon, currency (15), number style (1.234,56 / 1,234.56 / 1 234,56), and categories (emoji + name, add, rename, remove, reset).
- **Backup:** download or restore a JSON backup, and export a year to CSV for Excel (`;`-separated, comma decimals).
- Works offline (Firestore offline cache + service worker). It can be installed to the home screen.

## Setting up Firebase (one time, ~10 minutes)

1. <https://console.firebase.google.com> → **Add project** → name it e.g. `budget` (Google Analytics: off).
2. **Build → Authentication → Get started → Email/Password → Enable** (leave "Email link" off).
   Then **Settings → User actions → untick "Enable create (sign-up)"** so nobody can register themselves.
3. **Authentication → Users → Add user** for each person (email + a starting password).
4. **Build → Firestore Database → Create database** → location `eur3 (Europe)` → *production mode*.
   **Rules** tab → paste all of `firestore.rules` → **Publish**.
5. **Project settings (gear) → Your apps → Web (`</>`)** → register app "Budget" (no hosting) → copy the `firebaseConfig` object into `docs/config.js` as `window.BUDGET_FIREBASE = { ... };`.
6. In Google Cloud console → **APIs & Services → Credentials** → the "Browser key" → restrict it to HTTP referrers:
   `davitos223.github.io/*`, `localhost:5174/*`, `budget-600b6.firebaseapp.com/*` (done 2026-11-22).

Without a config (`null`), the app runs in **demo mode**: no login, data only in that browser.

## Sharing a budget

1. Person A: switch budget (tap the name at the top) → **New shared budget**.
2. Person B: Settings → Your account → **Copy code**, and send it to A.
3. Person A: Settings → People → paste the code and B's name → **Add person**.

## Development

- Local preview: `py -3.12 -m http.server 5174 --bind 127.0.0.1 --directory docs` → <http://localhost:5174>.
  With a real config, local testing signs in to the **real** project.
- On every release, bump the version in **three places together**: `APP_VERSION` in `docs/index.html`, the `?v=` on the `config.js`/`cloud.js` script tags, and `version:` in `docs/cloud.js`.
- Screenshots for docs must use the demo mode with invented data, never a real budget.
