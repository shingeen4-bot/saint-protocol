# Saint Protocol — Personal Progression (v0.4)

A private, iPhone-first, offline-capable personal tracker with a dark violet performance aesthetic. This is a **Progressive Web App**, not a native App Store binary.

## What works

- Home dashboard: overall level, XP today, streak, weekly XP, daily standards and attributes.
- **Attribute radar** on Home with a persistent-screen toggle between **Lifetime / 7 days / 30 days**. Lifetime uses level + fractional next-level progress; recent views use XP actually earned within each inclusive date window, with clear unit labels. The radar is not an objective measure of skill.
- Today: tappable habits, quick activity logging, daily timeline, edit-by-deletion.
- Activity logger: categories, XP levels, notes, date and optional workout metrics (sets/reps/weight/minutes).
- XP: one primary attribute, diminishing returns for identical actions, daily routine cap of 30 XP per attribute, 50 XP milestones, every fifth level gated by a documented milestone. The score is recalculated from event history after changes.
- Progress: 7-day chart, attribute levels, fitness metrics, finance log and achievement badges.
- Goals: custom measurable goals, progress increment/decrement, optional due date.
- Journal: reflections, optional weekly reviews and auto-generated seven-day performance summary.
- In-app evening reminder, editable app name and active daily habits.
- Local-only Dexie/IndexedDB storage, downloadable JSON backups and JSON restore.
- Home Screen manifest and service worker for basic offline operation.

## What's **not** in v0.4

- True background iPhone push notifications or automatic iCloud sync.
- AI interpretation of arbitrary natural-language entries. You can type entries freely, but choose their primary attribute and XP manually.
- Dedicated workout programming, bodyweight tracker or exercise library.
- Bank integration or automatic goal completion based on activity metrics.
- Editing previous entries beyond deleting/re-logging them.

## Run locally

Requires Node.js 20+ and an internet connection for the initial dependency install.

```bash
npm install
npm run dev
```

Open the local URL Vite shows. For an iPhone test on the same Wi-Fi, use your computer's LAN IP and Vite port. **The PWA installation and service worker require HTTPS (or localhost), so use GitHub Pages for your final iPhone installation.**

To build:

```bash
npm run build
npm run preview
```

## Deploy free to GitHub Pages

1. Create a new **public** repository, e.g. `saint-protocol`, on GitHub.
2. Upload these project files to the repository's `main` branch (including `.github/workflows/deploy.yml`).
3. In repository **Settings → Pages**, choose **GitHub Actions** under Source.
4. Push an update if necessary; the included workflow will build and deploy the static app.
5. Open the published HTTPS URL on your iPhone in Safari → Share → Add to Home Screen → Open as Web App.

Static app code is public if the GitHub repo is public; **your journal, financial entries and other private tracking data are not published with the code**. They stay in your iPhone's IndexedDB unless you export a backup. You can choose a private repo only if your GitHub plan supports Pages publication for it.

## Backup warning

Safari / iOS can remove website storage (including IndexedDB). The PWA's data is not automatically synced or backed up. After initial use, export a JSON file through Settings, save it to Files/iCloud Drive, and export another after significant updates. The backup file itself contains private journal and financial data; keep it somewhere appropriately private. Restore replaces the current local database.

## Scoring summary

- Baseline levels: Sales 1; Communication 2; Presence 3; Discipline 2; Resilience 4; Physical 3; Knowledge 3. Business is inactive.
- Next threshold: `100 + 25 * (current level - 1)`.
- Routine XP choices: 5, 10, 15, 20; milestone 50.
- For repeated same-day activity, award 100%, 50%, 25%, then 0%, rounded to the nearest integer. Daily routine XP capped at 30 per attribute; milestones bypass cap.
- Advancing into levels divisible by five requires a documented milestone. All earned XP remains banked until unlocked.
- Overall level is the floor of the arithmetic mean of the seven active attribute levels.
- Streak counts consecutive days with at least one logged action and can include yesterday until today's first action.

## Technical stack

Vite + React + TypeScript; Lucide React icons; Dexie/IndexedDB; Recharts; custom CSS; GitHub Pages; service worker. No server, analytics scripts, authentication, AI keys or subscription.

## Project status

Source produced without an npm install/build in the authoring environment because its package registry was not reachable. Run `npm install && npm run build` before publishing and report any errors for correction.

## Design reference

`design/radar-v0.4-concept.png` is an illustrative radar-card mockup; `design/home-concept.png` is an older Home-screen concept. Both are illustrative mockups of the proposed Home screen, **not a screenshot of a verified running React build**. The live UI is defined in `src/App.tsx` and `src/styles.css`.

## Saint Protocol visual system (v0.4)

The five-screen layout, component hierarchy, colour tokens and interaction specifications are documented in `design/DESIGN.md`.

Open `design/prototype.html` for an interactive, **sample-data-only** preview of Home, Today, Progress, Goals and Journal. Those sample screens are a visual reference, **not the full running React application**.

All of the React application's branding, PWA metadata, icons, chart accents and component styles have been re-themed in v0.2. The app's IndexedDB identifier deliberately remains `king-os-v1` to retain data if the earlier prototype has already been used on this device; existing KING OS branding values are migrated to SAINT PROTOCOL on startup, without resetting saved records.

**Verification:** the XP unit tests run in this environment. A full `npm install`/`npm run build` cannot be completed here because the npm package registry cannot be resolved. Build and device QA remain required before release.

### v0.4 visual refinement

The Home overview radar now offers Lifetime, 7 days and 30 days with live data and a seven-attribute legend. There are no fictional datapoints in the React app. The styling adds **restrained purple ambient glows** on the hero card, selected period tab, radar polygon, active navigation and primary actions; card surfaces and body text stay low-contrast and legible. The interactive sample-data-only visual prototype has the same three modes.

The 7- and 30-day radar views intentionally display **awarded XP**, not attribute levels. Each period can use a different scale; compare activity patterns rather than polygon area between periods.
