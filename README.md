<div align="center">

<img src="docs/icons/icon-192.png" width="96" height="96" alt="">

# Budget

**A private, good-looking budget for the whole family.**
Enter your income and bills once, tick them off as you pay, and always know what's left.

[**Open the app**](https://davitos223.github.io/budget-app/)

<br>

<img src="screenshots/desktop-light.png" alt="Budget on a computer: the total card with income, bills, spending and savings, rings for money going out and left over, and spending limits" width="100%">

<br><br>

<img src="screenshots/phone-home.png" width="23%" alt="Phone: overview">&nbsp;
<img src="screenshots/phone-limits.png" width="23%" alt="Phone: spending limits">&nbsp;
<img src="screenshots/phone-add.png" width="23%" alt="Phone: adding spending">&nbsp;
<img src="screenshots/phone-goals.png" width="23%" alt="Phone: savings goals">

<sub>Screenshots use made-up demo data.</sub>

</div>

---

## Contents

- [Features](#features)
- [A tour of the app](#a-tour-of-the-app)
- [Getting the app](#getting-the-app)
- [Sharing a budget](#sharing-a-budget)
- [Updates](#updates)
- [Your data and privacy](#your-data-and-privacy)
- [How it works](#how-it-works)
- [For developers](#for-developers)

## Features

- **Left after bills, at a glance.** One big number, plus income, bills, spending, savings and what's left after everything.
- **Enter bills once.** Choose how often each one comes (every month, every 2, 3 or 6 months, every year, or just once), and optionally when it ends. It appears in every month on its own.
- **Tick bills off.** Direct debits (*Autopay*) tick themselves on their due day.
- **Upcoming payments** show "today", "in 2 days" or "3 days late", with overdue and due-soon warnings.
- **Just this month:** change a bill's amount or skip it for one month without touching the others.
- **Spending limits** for each category, e.g. "€194 left of €600", with "You're doing great 👍", "Getting close" or "Over by …".
- **Savings goals** with a target and a date. The app works out how much to put aside each month, and money you put in counts in that month's budget.
- **The year at a glance:** monthly bars, totals, the best month, a category donut and the biggest bills.
- **Private budgets for everyone**, plus optional **shared** ones (e.g. "Household") that show who added what.
- **Make it yours:** theme, 8 colours, 3 text sizes, the page it opens on, bill order, hide-amounts mode, currency and number style, editable categories, carry-over.
- **Backups:** download or restore a backup, and export a year to Excel (CSV).
- Works on phone and PC, installs to the home screen, and keeps working offline.

## A tour of the app

### Overview

<img src="screenshots/desktop-light.png" width="100%" alt="Overview on a computer">

The coloured header holds the month switcher. The white card shows **left after bills**, with the coloured bar splitting the month into bills, spending, savings and what's left. Underneath: how much is **still to pay**, how much is **safe to spend** per day for the rest of the month, and what you've **saved**. The rings compare money going out and money left over with last month.

### Bills and upcoming payments

<img src="screenshots/phone-bills.png" width="32%" alt="Phone: bills list">&nbsp;
<img src="screenshots/desktop-month.png" width="66%" alt="Bills, spending, income, savings and where the money goes">

Tap the circle to mark a bill as paid. Bills on *autopay* tick themselves on their due day. Bills that are overdue or due soon get a coloured tag, and the **Upcoming payments** card lists what's left to pay this month. Tap any bill to edit it, change it just for this month, skip it, or stop it from a month on while keeping its history.

### Spending limits

<img src="screenshots/phone-limits.png" width="32%" alt="Phone: spending limits">

Give categories such as Groceries or Eating out a monthly limit. Each limit shows how much is left, a bar (darker for what's paid, lighter for bills still to come) and a friendly status. When you set a limit, the app shows your average for the last three months so you can pick a realistic number.

### Adding things

<img src="screenshots/phone-add.png" width="32%" alt="Phone: add spending">

On the phone, the **+** button adds spending, a bill or income in a few taps. Amounts work with a comma or a dot.

### The year

<img src="screenshots/desktop-year.png" width="100%" alt="Year view: monthly bars, category donut and biggest bills">

Income against bills and spending for every month (faded bars are months still to come), what's left over for the year, the average per month, the best month, where the money went by category, and the biggest bills. Tap a month to open it.

### Savings goals

<img src="screenshots/phone-goals.png" width="32%" alt="Phone: savings goals">

Make a goal for a holiday, a new sofa or an emergency fund. Put money in or take it out whenever you like; it shows up in that month's budget. With a target date, the app tells you how much to put aside each month.

### Settings and themes

<img src="screenshots/desktop-settings.png" width="66%" alt="Settings">&nbsp;
<img src="screenshots/phone-dark.png" width="32%" alt="Phone in dark mode">

**Your look** (only on your own login): Auto, Light or Dark theme, 8 colours, Normal, Large or Extra large text, which page the app opens on, bill order, and *hide amounts* (the 👁 button blurs every number, which is handy in public).
**Each budget:** name and icon, currency, number style, categories with your own emoji, spending limits, and carrying leftovers over to the next month.

## Getting the app

### Phone

1. Open **https://davitos223.github.io/budget-app/** and sign in with the login you were given.
2. Add it to the home screen:
   - **iPhone (Safari):** Share button → *Add to Home Screen*.
   - **Android (Chrome):** ⋮ menu → *Add to Home screen* / *Install app*.

It then opens full screen like a normal app.

### Computer

Open the same link in any browser. In Edge or Chrome you can also use *Install app* in the address bar to give it its own window.

## Sharing a budget

Everyone gets a **private** budget the first time they sign in. Nobody else can ever be added to it.

To plan something together:

1. Tap the budget name at the top → **New shared budget** (e.g. "Household").
2. The other person: **Settings → Your account → Copy code**, and send you the code.
3. You: **Settings → People** → paste the code and their name → **Add person**.

Only the person who created a shared budget can add or remove people or delete it. Anyone can leave a budget they were added to.

## Updates

The app is served straight from this repository, so every change goes live within a few minutes. Phones pick it up the next time the app is opened (sometimes it takes two openings). The version number is shown at the bottom of Settings.

## Your data and privacy

- **Logins only.** You can't create an account yourself; the owner adds each person.
- **Every budget has its own list of people**, and the database rules let only those people read or write it. Without a login, everything is refused.
- **Private stays private.** A personal budget can never get extra members.
- Your look settings belong to your login only.
- **No budget data is in this repository.** It only holds the app's code.
- The app has no ads, no analytics and no tracking.
- **Backups:** Settings → *Download backup* saves everything in a budget to a file, and *Restore backup* brings it back.

## How it works

```mermaid
flowchart LR
  P["Phone / PC browser"] -- "app files" --> G["GitHub Pages<br/>(this repo, docs/)"]
  P -- "sign in" --> A["Firebase Auth<br/>(email + password, no sign-up)"]
  P <-- "live sync + offline cache" --> F["Firestore<br/>(budgets the login is a member of)"]
  R["firestore.rules"] -. "who may read/write" .-> F
```

- `docs/index.html`: the whole app (one page, no build step).
- `docs/cloud.js`: sign-in and sync through Firebase, with an offline cache.
- `docs/config.js`: which Firebase project to use (set it to `null` for demo mode, where data stays in the browser).
- `docs/sw.js`: service worker. It always tries the newest version first and falls back to the saved copy when offline.
- `firestore.rules`: the access rules (members only, private budgets stay private, only the owner manages people).

Data layout: `budgets/{id}` (name, kind, owner, members, currency, categories, limits) holds `entries` (income, bills, spending), `months/{YYYY-MM}` (paid ticks, one-month amounts, skips, notes) and `goals`. Each person's look settings live in `users/{uid}`.

## For developers

- **Run locally:** `py -3.12 -m http.server 5174 --bind 127.0.0.1 --directory docs`, then open <http://localhost:5174>. This uses the real project, so add **`?demo`** (<http://localhost:5174/?demo>) for a demo mode that never touches it. Demo mode only works on localhost.
- **Screenshots:** `node tools/screenshots.mjs` (Node 22+ and Edge or Chrome) rebuilds everything in `screenshots/` from a demo copy with invented data. Never use a real budget for screenshots.
- **Releases:** bump the version in **three places together**: `APP_VERSION` in `docs/index.html`, the `?v=` on the `config.js` / `cloud.js` script tags, and `version:` in `docs/cloud.js`.
- **Firebase setup** (only for a new project): Email/Password sign-in with *create (sign-up)* and *delete* turned off, Firestore in production mode with `firestore.rules` published, and the browser API key restricted to the site's addresses (`davitos223.github.io/*`, `localhost:5174/*`, `<project>.firebaseapp.com/*`).
