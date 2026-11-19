# Rafiki Tax changelog

Newest first. One entry per round of changes. Covers Figma (04 Landing and Login, 05 Web Features, 03 Main Components) and the clickable prototype.

Live prototype: https://rafiki-tax-prototype-production.up.railway.app/ (Railway, redeploys on every push to GitHub)

---

## v1.3 · 19 Nov 2026 · Phone layout, round 2 (after the first Android Chrome test)

Built and checked in a 412px headless render, light and dark. Awaiting the phone test.

### Prototype
- **Header breathing room:** the app is pinned to the screen (no page scroll under the Chrome toolbar) and the top bar has 16 px extra space above it.
- **Sticky columns:** in tables on phones the first column stays put when scrolling sideways; with selection on, the checkbox column and the first data column both stay.
- **Nav icons in dark mode:** the active icon on the lime pill now uses the accent text colour (was about 1.3:1, now 6:1 in dark).
- **Layout fixes:** success and warning toasts fit the screen; tabs scroll sideways inside the white card instead of stretching it; page actions wrap; filters left-aligned; Help is one column.
- **Purchases:** Tracker, Weekly batch and Export CSV fold into one Actions dropdown on phones (Upload receipt stays visible). Filters: Source and Network share a row at 50% each with a 16 px gap, Date range takes the full width.
- **Landing page on phones:** nav fits (Sign in hidden on phones, theme and Check my expenses stay), product pictures scale to fit, feature tabs scroll, footer stacks, no sideways page scroll.

### Open
- Same Actions-dropdown and filter-grid treatment for Suppliers, Tracker and Evidence still to do.
- Sign in is hidden on the phone landing nav; consider moving it into the hero.
- Home queue rows, Invoice Builder, Evidence, Search, Profile and Settings still need dedicated phone passes.

---

## v1.2 · 19 Nov 2026 · Phone layout and installable PWA (first pass)

The prototype now has a phone layer, so one coded app covers Android, iPhone and installable use. Figma is unchanged: it keeps the web desktop and Android mobile references only.

### Prototype
- **Phone layout (≤720px):** one column, 48 px tap targets, 16 px edge padding, 56 px buttons, 16 px inputs (no iOS zoom), `100dvh` and safe-area insets. Tablets and wider keep the desktop layout.
- **Phone shell:** sidebar replaced by a top bar (search field with Ask Rafiki inside it, plus the bell) and a bottom navigation bar (Home, Purchases, Builder, Suppliers, More). More sheet: Evidence, Settings, Profile, Help, Sign out. Bell opens a full-screen notifications list. Toasts become full-width snackbars above the nav bar.
- **eTIMS Sync on phones:** a "Synced with eTIMS at 9:15 AM · Sync now" row on Home (the header button is desktop only). Shared sync state, so both stay in step.
- **New button:** a floating "New" pill on Home, Purchases and Suppliers with Upload receipt (file or camera picker, same receipt reader as Purchases) and Start an invoice. Replaces the round Android FAB in code only.
- **Home on phones:** stat tiles stack full width with sparklines; the queue and Next 30 days stack in one column; the page title and desktop buttons give way to the shell.
- **Platform hook:** `<html data-platform="ios|android|other">`, not used yet. For iPhone tweaks after testing (nav pill, app bar title, New button).
- **PWA:** web manifest (standalone, opens at #/home), icons (192, 512, maskable, Apple touch), service worker with versioned precache (offline shell), registered only on HTTPS or localhost.
- **Fonts self-hosted** (@fontsource, in dependencies). Works offline and without Google Fonts. Plus Jakarta Sans now includes weight 800, which was faked before, so some headings may look slightly bolder.
- **Build:** `npm run build` also copies fonts and PWA files and writes `docs/sw.js`. Server sends no-cache for `sw.js` and the manifest.

### Open
- Home queue rows do not yet follow the Android Review Queue Row order (status, identity, amount, supporting line, actions).
- Purchases, Suppliers, Invoice Builder, Evidence, Search, Profile and Settings still use desktop layouts below 720px.
- Focus screens (Builder, Help, full Evidence) have no mobile top bar.
- Demo tab sits over the left edge of sheets.
- The New pill is not in Figma yet; the Android file still shows the round FAB.
- Needs a real-phone test on Android Chrome and iPhone Safari, including install and offline.

---

## v1.1 · 19 Nov 2026 · VAT-registered seller

KRA does not allow buyer-initiated invoices for VAT-registered sellers. Rafiki now catches this before anything is sent.

### Figma · 05 Web Features (04. Invoice Builder, Flow 8)
- Blocked and Write message screens: the blocking card shows "Checked on eTIMS" instead of "High confidence" (it's a fact from eTIMS, not a guess).
- Dismiss removed from the blocking card, so the block can't be waved away.
- "Save draft" is now "Discard draft" once blocked (a draft that can never be sent is a dead end).
- New end state: "8. Invoice Builder / Desktop / VAT-registered seller: Asked". The purchase opens in Purchases as At risk, waiting for Juma's eTIMS invoice, with a success toast. Note added; no overlaps.

### Prototype
- New flow: Juma Building Supplies (P051428863M, VAT-registered). Checking (about 2 s) → Blocked → Write message → Open WhatsApp to send → purchase "exp_juma" in Purchases as At risk (KSh 4,850.00), supplier history updated.
- Juma Building Supplies added as a supplier (On eTIMS, VAT-registered).
- Demo panel: "VAT seller: Checking" and "VAT seller: Blocked". "Reset Module 4 data" restores Juma.
- Agent suggestions can now be read-only (no Dismiss/Edit/Accept) and carry a "Checked on eTIMS" badge.

### Open
- No natural entry point yet: the flow starts from the Demo panel. Option: a chat picker under "Shared or forwarded chat" (needs a Figma screen).

---

## v1.0 · 18 Nov 2026 · First release

### Prototype (clickable, fake data)
- Live on Railway since 18 Nov 2026, 15:45. Checked: landing, sign-in and theme toggle work.
- Landing page is the first screen: hero carousel (4 slides), Why now, How it works, Start without connecting, five feature tabs (incl. Pay with Rafiki), Stay ahead, Principles, FAQ, CTA, footer. Light/dark toggle in the header.
- Sign up, sign in, onboarding (5 steps). Any valid phone or email works; any 6-digit code except 000000.
- Home: review queue, item drawers, stat cards with "i" tooltips (At risk, Waiting, Covered), interactive Deadlines timeline (drag, resize, arrow keys), notifications.
- Purchases: list, record types, tracker, weekly batch, CSV export, evidence pack.
- Suppliers: list, profiles, remind, setup guide, confirm, add, edit payment details.
- Invoice Builder: landing, choose a source, builder, confirm and send, sent states, credit note, Pay sheet (app PIN 1234).
- Evidence: index, agent trace, evidence trail, full view, export pack.
- Search: ⌘K quick search, results page, Ask Rafiki panel.
- Profile: personal details, language, notifications, security, appearance (System, Light, Dark, Rafiki Dark Teal, all working).
- Settings: business profile, staff and PIN cards, connected data (Allow payments + daily limit), data and privacy. Dialogs: Change PIN, Add staff, View PIN card, Daily limit, What Rafiki can see, Delete data.
- Help: 31 articles in 8 groups, opened from the header Help link or the avatar menu.
- eTIMS Sync: Syncing state, then a sync-complete toast.
- Dark modes: fixed the selected source card icon, hover rows and hover tints, and the Deadlines "Today" label.
- Deploy: GitHub + Railway (tiny Node server, /health, pinned packages).

### Figma · 05 Web Features
- Identity everywhere: Wanjiku Achieng, Wanjiku Fresh Greens Ltd, P051234567Z (was Amina Said / Said General Store).
- Home: Quick Fix row in Deadlines; new screen "Review queue: Stat explained" (tooltip); new Flow 5 "eTIMS sync" (Syncing, Complete).
- Invoice Builder: builder sequence fixed (Vitunguu price missing → suggestion → accepted), M-Pesa network, credit note defaults to Wrong amount, "Raise a credit note" on Approved, KSh 2,500 amounts.
- Evidence and Search: rows and stories remapped to the Purchases data.
- Profile and Settings: Allow payments option card; new dialog screens (Change PIN, Add staff, View PIN card, Daily limit, What Rafiki can see, Delete data) with LC / Profile and Settings / Dialog and atoms / settings / access row.

### Figma · 04 Landing and Login
- Sample data matched to the product: Mama Wanjiku is Not on eTIMS (PIN P051234567A, 0712 345 678, KSh 2,500 on Sat 14 Nov); supplier profile dates fixed; evidence trail down to 4 records (credit note hidden); notifications card now Kamau Hardware and Gathoni Packaging.

### Figma · 03 Main Components
- Card top structure: Show Info boolean with an "i" Icon Button; KPI Tile shows it.
- PIN Card (Staff): sample subtitle now "Staff card · Peter Otieno". Still not linked to the Subtitle property.

### Open
- FAQ answers exist only in the prototype; Figma accordion slots are empty.
- Neutral toasts are dark in the prototype, light in Figma.
- Mobile money flows in Settings not designed yet.
