# Saint Protocol · Mobile UI Specification (v0.4)

## Identity

**Product:** Saint Protocol. Private personal performance operating system, not a SaaS product.
**Platform:** iPhone-first installable PWA; standalone, offline-capable, no sign-in.
**Visual language:** understated, tactical, athletic, calm. Not gamified illustration, no giant initials, no K monogram, no bright green. Game mechanics operate behind sober performance analytics.

### Tokens

| Token | Value | Role |
| --- | --- | --- |
| Canvas | `#08070D` | Overall background |
| Surface | `#121019` | Standard cards |
| Raised surface | `#191525` | Interactive panels |
| Hairline | `#2A2537` | Borders and separators |
| Main text | `#F4F1FB` | Primary typography |
| Secondary text | `#948FA4` | Helper text |
| Accent | `#AA8BFF` | Selection, progression, controls |
| Deep purple | `#5A3B7E` | Low-emphasis badges and glows |

Font: Inter/system sans; typography hierarchy with large editorial screen title and small uppercase metric kicker. Typical horizontal inset 23–25px; vertical rhythm 8 / 12 / 18 / 24px; cards 14–18px corners, 1px subtle borders. Purple is the **only** non-neutral semantic accent in v0.2; failures are text explanations, not red badges by default. Respect user preference for dark-only appearance.

## Navigation

Persistent bottom tab bar: **Home / Today / Progress / Goals / Journal** with restrained 1–2 px icons and active purple state. Safe-area padding for iPhone home indicator. Settings at top-right on every screen. Do not auto-reset tab state after closing modals.

## Screen A · Home (Overview)

**Question answered:** Where am I today, and what remains to be done?

Hierarchy from top to bottom:
1. Quiet uppercase **SAINT PROTOCOL** wordmark and Settings gear. No lettermark box.
2. Date kicker; title **Overview.**; short plain subtitle.
3. Primary violet/graphite **Personal Progression** card: current overall attribute level, cumulative XP, XP earned today and active streak. Circular radar ornaments have no meaning and must remain behind text at low contrast.
4. Two half-width compact cards: **Today's execution** (completed / due daily habits and ring) and **This week** (7-day XP + action count + micro-bars).
5. **Attribute balance**: a seven-axis radar immediately below the compact metrics. Period tabs **Lifetime / 7 days / 30 days**; lifetime is level + fractional next-level progression, recent windows are awarded XP. Display a numeric summary and every attribute below the chart; zero XP window has explicit empty-state text. Active tab and radar polygon use subtle purple highlights and glow; do not add glows to every card.
6. **Daily standards**: visible tappable completed/incomplete rows; scroll to view all. One tap toggles action; completion is persisted.
7. Quick actions: **Log activity** and **Journal**; below fold, condensed attributes and quest access.

Empty-state requirement: show zeros, not fabricated demo stats. The visual prototype uses explicitly fictional examples; production UI reads IndexedDB only.

## Screen B · Today

**Question answered:** What can I record in a few seconds?

- Date and title; progress ring with x/y non-negotiables complete.
- Full list of user-configured habits with a one-tap toggle. Allow opening Settings to adjust enabled habits.
- 2×2 quick-log grid for workouts, skills, sales and resilience.
- Today's activity timeline with time, category, earned XP and deletion option.
- Persistent visual + accessible save confirmation; toggles must be idempotent within a day.
- Activity sheet: title, primary attribute, completion date, routine/milestone type, base XP, optional sets/reps/load/minutes and notes.

## Screen C · Progress

**Question answered:** Is my actual execution improving?

- Segment selector: **Attributes / Fitness / Finance / Awards**.
- Attributes: cumulative XP, active streak, seven-day bar chart, seven attribute progress rows and locked milestone gates. Business inactive by default.
- Fitness: number of physical actions, max logged load, training volume (only from entries containing sets × reps × load), chronological workout log and add button.
- Finance: manually entered income, expenses and net cash flow; **never** mislabel net transaction flow as balance.
- Awards: unlocked and locked milestone tiles.
- All metrics show date range and explicit units. Do not confuse XP with real-world competence or financial performance.

## Screen D · Goals (Objectives)

**Question answered:** What measurable outcomes am I working toward?

- Title **Objectives.**; active and completed goal counts.
- Cards with attribute, exact goal name, current/target/unit, percent progress, due date if set and increment/decrement controls.
- Explicit creation button; target must be positive. Never award goal completion XP automatically in v0.2; real-world milestone log is a separate action.
- Milestone gates explained without a faux lock wall or overbearing gamification.

## Screen E · Journal

**Question answered:** What happened, what did I learn, and what changes next?

- Title **Journal.**; private, spacious writing-focused layout.
- Hero prompt **What changed today?**, with **Write an entry** button.
- Weekly review card: auto-calculated last-7-days XP, action count and active days, followed by a manual written reflection.
- Recent entries as chronological cards with date, entry type, mood score and user-written text.
- Form sheet supports daily reflection or weekly review; date, 1–5 mood and long-form text.

## Progression and storage constraints (unchanged)

- Primary attributes: Sales / Communication / Presence / Discipline / Resilience / Physical / Knowledge. Business inactive.
- Initial levels: 1 / 2 / 3 / 2 / 4 / 3 / 3.
- XP bands: routine 5/10/15/20; milestone 50. Routine repeat rewards 100%, 50%, 25%, then 0% on same day; routine cap 30 XP / attribute / day.
- Threshold from level L to L+1: `100 + 25 × (L−1)` XP; every fifth level has a real-world milestone gate.
- Overall level = floor of mean of seven active attribute levels.
- Source of truth is stored event history. Deletions and restores recalculate scores, not mutable counters.
- IndexedDB / Dexie local storage; manual JSON backup/restore. Device storage can be cleared; keep regular off-device backups.
- In-app reminder only when open. No promise of closed-app iOS alarms.
- No sign-in, network backend or subscription.

## Interaction and quality gate

1. The app is first designed around a 390×844 iPhone viewport and must also work down to 320px.
2. Buttons and habit rows should have at least ~44px effective touch target where practical.
3. All progress states must have a text counterpart; do not rely on colour alone.
4. Empty, loading, saving, error, restore and offline states require clear feedback.
5. Validate on actual iPhone Safari PWA, especially persistent IndexedDB, safe-area insets and scrollable modal sheets.
6. Run `npm install`, `npm run build` and `npm test` before deployment. Unit test alone does not validate the full app.
7. Prototype HTML and PNG screenshots are **illustrations using sample data**, not proof that the production React app runs.

## v0.4 radar behaviour and lighting

- The attribute radar is placed below the two overview KPI cards on the Home screen. No Business axis while Business is inactive.
- Recent-window data is inclusive of today and the previous 6 or 29 calendar dates. It is derived from the same centrally scored action history as every XP metric.
- Lifetime displays current level with next-level progress. A blocked milestone gate cannot visually imply a completed level.
- Period controls retain state while navigating between screens. The seven legend values and the central period total update immediately.
- Purple glows are limited to primary actions, the main progression hero, active tab, chart polygon and active radar period. All supporting cards remain near-black with barely illuminated edges.
