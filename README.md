# Rafiki Tax: clickable prototype

A working prototype of **Rafiki Tax** (concept project): tax-ready purchases for Kenyan businesses.
Everything is **fake data**. Nothing is sent to KRA, M-Pesa or anyone else.

Built to match the Figma files *04. Rafiki Tax – Landing and Login* and *05. Rafiki Tax – Web Features*.

## Open it

**On your Mac:** double-click **`START HERE.html`** (or `docs/index.html`). It opens in your browser. You don't need to install anything.

**Online (Railway):** push this folder to GitHub, then in Railway choose *New Project → Deploy from GitHub repo* and pick the repo. Railway reads `package.json` by itself: it installs, runs `npm run build`, then `npm start` (a tiny server that listens on Railway's `PORT`). No settings or environment variables are needed. When it's live, generate a public domain in the service's networking settings. Optional: set the healthcheck path to `/health`.

**Locally like Railway:** `npm ci && npm run build && npm start`, then open http://localhost:3000.

## Landing page

The prototype opens on the landing page (`#/`). *Check my expenses* starts sign-up, *Sign in* opens sign-in (or *Open the app* if you're already signed in). The sun/moon button switches light and dark. Feature tabs, the hero carousel and the FAQ all work.

## Help and eTIMS Sync

- **Help** (top bar, next to eTIMS Sync, or the avatar menu) opens the help pages: 31 articles in 8 groups, with On this page links and Previous / Next.
- **eTIMS Sync** shows Syncing, then about 3.5 seconds later a toast says the sync is complete.

## Test values

| What | Value |
|---|---|
| SMS or email code | any 6 digits, e.g. `123456` (`000000` shows the "didn't match" state) |
| Sign in | any valid phone number or email opens the demo business (Wanjiku Fresh Greens) |
| KRA PIN that is found | `P051234567Z` (also `A123456789B`, `P052468013K`) |
| KRA PIN that is not found | `P000000000X` (or any other valid-looking PIN) |
| Upload that fails | any `.xlsx` file |
| App PIN (Pay sheet) | `1234` (any other PIN shows the wrong-PIN state) |
| Seller KRA PIN you can type in the builder | `P051234567A` (Mama Wanjiku) |

**Prototype controls:** the small **Demo** tab on the left edge (or press **Shift + D**). It has the test values, switches (finding *At risk* / *All clear*, Google/Microsoft *succeeds* / *gets cancelled*), jump links to every screen, and **Reset all data**.

## What's built

| Module | Status |
|---|---|
| 1. Sign up, Sign in, Onboarding (5 steps), app shell | ✅ Ready to test |
| 2. Home (review queue, item drawers, deadlines, notifications, record page) | ✅ Ready to test |
| 3. Purchases (list, 5 record types, tracker, weekly batch, CSV + evidence pack) + Suppliers (list, profiles, remind, setup guide, confirm, add, edit payment) | ✅ Ready to test |
| 4. Invoice Builder (landing, choose a source, builder, confirm and send, sent states, credit note) + notifications while building + Pay sheet | ✅ Ready to test |
| 5. Evidence (index, agent trace, evidence trail, full view, export pack) + Search (⌘K overlay, results page, Ask Rafiki panel) | ✅ Ready to test |
| 6. Profile (personal details, language, notifications, security, appearance) + Settings (business profile, staff and PIN cards, connected data, data and privacy) + account menu | ✅ Ready to test |

## How it's made (for developers)

- **React 19**, bundled with **esbuild** into plain files in `docs/`, so it runs straight from a file or from GitHub Pages.
- **Design tokens** live in `src/styles/tokens.css` (names mirror the Figma variables). Change a value once and it changes everywhere.
- **Data:** `src/db.js` is a small NoSQL document store (collections of JSON documents, Mongo-style `find` / `insert` / `update` / `remove`), saved in the browser's localStorage. Seed data is in `src/seed.js`. Each browser keeps its own copy; *Reset all data* restores the seed.
- **Layout:** fixed sidebar and header; only the content area scrolls. Content sits on a 12-column fluid grid (32px gutters, 32px margins), matching the Figma desktop grid at 1440px and stretching at other widths. The sidebar collapses to icons below 1180px.
- **Icons:** the rafiki-icons set, exported from Figma into `src/icons.js`.

To rebuild after changing `src/` (then commit `docs/` too, so the file version keeps working):

```bash
npm ci
npm run build
```

- `server.mjs` is a tiny static server with no dependencies. It serves `docs/`, uses `PORT` (default 3000), and answers `/health`.
- `package-lock.json` pins React and esbuild so Railway builds exactly what you tested.
