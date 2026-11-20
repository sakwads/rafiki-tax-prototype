# Rafiki Tax prototype changelog

Newest first. Prototype changes only (the Figma changes are in the project changelog).

Live prototype: https://rafiki-tax-prototype-production.up.railway.app/ (Railway redeploys on every push to GitHub)

---

## v1.3 · 19–20 Nov 2026 · Phone layout, round 2

Built and checked in a 412px headless render, light and dark. Awaiting the phone test.

- **Header breathing room:** the app is pinned to the screen (no page scroll under the Chrome toolbar) and the top bar has 16 px extra space above it.
- **Sticky columns:** in tables on phones the first column stays put when scrolling sideways; with selection on, the checkbox column and the first data column both stay.
- **Nav icons in dark mode:** the active icon on the lime pill now uses the accent text colour (was about 1.3:1, now 6:1 in dark).
- **Layout fixes:** success and warning toasts fit the screen; tabs scroll sideways inside the white card; page actions wrap; filters left-aligned; Help is one column.
- **Purchases:** Tracker, Weekly batch and Export CSV fold into one Actions dropdown on phones (Upload receipt stays visible). Source and Network share a row at 50% each with a 16 px gap; Date range takes the full width.
- **Landing page on phones:** nav fits (Sign in hidden on phones), product pictures scale to fit, feature tabs scroll, footer stacks, no sideways page scroll.
- **Delete my data (matches Android Data and privacy):** type the business name to confirm (Delete everything, Export my data first). You stay signed in and land on an empty Home with the message "Your data was deleted. Rafiki starts fresh from your next purchase.", zero tiles and "No purchases yet". Toast: "Your data was deleted. You can start again." Staff and connected sources are cleared.
- **Delete account (new, matches Android Profile):** "Account" card in Profile. Type the business name, Delete account, then the app PIN keypad (1234 in the prototype). Signs out to Sign up with the toast "Your account was deleted."
- **Dialogs on phones:** buttons stack full width with the main action on top.
- **Onboarding stepper on phones:** logo and Finish later share the top row; the five steps get their own full-width row with a "Step N of 5 · Title" label.
- **Demo panel:** Home switcher gains "Fresh start".

Open: More menu is still a sheet (Android has a full page); delete flows are dialogs (Android uses pages); Actions dropdown and filter grid still to do for Suppliers, Tracker and Evidence; Sign in hidden on the phone landing nav.

---

## v1.2 · 19 Nov 2026 · Phone layout and installable PWA (first pass)

- **Phone layout (≤720px):** one column, 48 px tap targets, 16 px edge padding, 56 px buttons, 16 px inputs, `100dvh` and safe-area insets. Tablets and wider keep the desktop layout.
- **Phone shell:** top bar (search with Ask Rafiki inside, bell) and bottom navigation (Home, Purchases, Builder, Suppliers, More). More sheet: Evidence, Settings, Profile, Help, Sign out. Bell opens a full-screen notifications list.
- **eTIMS Sync on phones:** a "Synced with eTIMS · Sync now" row on Home.
- **New button:** floating "New" pill on Home, Purchases and Suppliers (Upload receipt, Start an invoice).
- **Home on phones:** stat tiles and cards stack in one column.
- **Platform hook:** `<html data-platform="ios|android|other">`, not used yet.
- **PWA:** manifest, icons, service worker with versioned precache, registered only on HTTPS or localhost.
- **Fonts self-hosted** (@fontsource). Plus Jakarta Sans now includes weight 800.
- **Build:** `npm run build` also copies fonts and PWA files and writes `docs/sw.js`.

---

## v1.1 · 19 Nov 2026 · VAT-registered seller

- New flow: Juma Building Supplies (VAT-registered). Checking, Blocked, Write message, Open WhatsApp, then the purchase appears as At risk.
- Juma Building Supplies added as a supplier.
- Demo panel: "VAT seller: Checking" and "VAT seller: Blocked".
- Agent suggestions can be read-only and carry a "Checked on eTIMS" badge.

---

## v1.0 · 18 Nov 2026 · First release

Landing, sign up and sign in, onboarding (5 steps), Home (review queue, deadlines, notifications), Purchases, Suppliers, Invoice Builder, Evidence, Search, Profile, Settings, Help (31 articles), eTIMS Sync, light and dark modes. Deployed on Railway via GitHub.
