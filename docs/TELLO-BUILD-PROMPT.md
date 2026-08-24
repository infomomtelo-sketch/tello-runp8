# BUILD PROMPT — TELLO: CARE HOME OPERATIONS CO-PILOT

Paste this whole file into a fresh Claude Code session. It is the complete spec
plus everything already learned the hard way.

---

## 1. WHO THIS IS FOR

One real user, today: an **administrator running 10 residential care homes**
(California RCFE, Title 22). She is drowning in caregiver scheduling.

Her world:
- Each home has **2 live-in caregivers**; they work a stretch, then take days off.
- A **reliever** covers a home while its live-in is off.
- **Night shift** must be covered separately.
- Caregivers submit **days-off requests** she has to approve without opening a hole.
- She also handles **time sheets** and **grocery lists** for the homes.

Her nightmare: a home goes uncovered and nobody notices until the morning of.
A home is never allowed to be empty — that is a Title 22 violation, not an
inconvenience.

**Tello is her guide.** Not a form, not a calculator. She should be able to say
"Grace needs Friday off" and Tello answers with who can cover, from which home,
and what it costs her elsewhere.

---

## 2. WHAT ALREADY EXISTS

Repo: `infomomtelo-sketch/tello-runp8`, branch `main`.
Deployed: Cloudflare Pages project **`site-free`** → `ownsite.app`
(NOT `tello.runp8.com` — that domain was never attached).

| Piece | State |
|---|---|
| React 19 + Vite 7, dark HUD (`#0a0e27` / indigo `#4f46e5`) | working |
| Supabase auth: sign in, sign up, password recovery | working |
| 5-step business onboarding | working |
| 9 `tello_*` tables in Supabase `nwlhsshvqmbhemhxcran` | migrated |
| Pages Functions at `/api/analyze`, `/chat`, `/vision`, `/reason` | deployed |
| Claude calls (`claude-haiku-4-5`) in `shared/tello-claude.js` | written, **never verified** |
| Structured analysis parser (+11 tests) | passing |
| Decision console, timeline, outcomes, share links | working |
| `worker-index.js` — optional standalone Worker, same logic | working |

**BLOCKER, unresolved:** `ANTHROPIC_API_KEY` has never returned a successful
response. Every AI feature is invisible until it does.
**Diagnose first — do not build anything until this is green:**
open `ownsite.app/?diag=1`. It posts to `/api/analyze` and names the cause:
404 (Functions not deployed) / key missing / key rejected / other.

Separate, working, no setup needed:
**Caregiver Coverage Board** — https://claude.ai/code/artifact/5258bede-0782-40b1-9675-ae11816cf5db
A self-contained artifact: 10 homes × 14 days, day+night slots, gaps in red,
double-booking prevented, time-off requests. It saves into its own page.

---

## 3. WHAT TO BUILD

### 3.1 Scheduling (highest value — her actual pain)
- Homes with per-home required cover: N on days, N on nights.
- Caregivers: live-in (assigned to a home) or reliever (floating).
- 14-day board: homes down, days across, day/night slot per cell.
- **Gap detection is the core feature.** Any slot below its required count is
  surfaced in plain language *above* the grid, soonest first.
- Hard rule: one person cannot be in two homes in the same slot.
- Time-off requests → approve/deny, warn when approval creates a gap.
- Repeating patterns (e.g. 5 on / 2 off) so she isn't filling 280 cells by hand.

### 3.2 Tello as guide (the reason it's called Tello)
Given a request like "Grace needs Friday off":
- List who can actually cover — respecting days off, existing assignments,
  reliever availability, and how far they'd travel.
- Rank the options and say the trade-off of each ("Rowena is free, but she's
  already on 6 straight days").
- Recommend one, and say plainly when there is no good answer.
- Multi-turn: she pushes back, Tello re-plans.
- **Tello must see the schedule.** Pass current assignments, staff, time off and
  gaps into the prompt. Without that it is a chatbot, not a co-pilot.

### 3.3 Time sheets
- Hours per caregiver per pay period, derived from assignments and adjustable.
- Live-in vs hourly handled differently.
- Export to CSV/PDF for payroll.

### 3.4 Grocery lists
- Per home, running list, check off when bought.
- Recurring staples.
- Photo of a receipt → itemised (uses `/vision`).

### 3.5 Calendar and reminders
- Reminders: license renewals, inspections, staff certifications, follow-ups.
- Proactive alerts: **`tello_alerts` exists and nothing writes to it.** A
  scheduled job should review open gaps, stale requests and expiring
  certifications and write alerts. This is what makes Tello feel awake.

### 3.6 Documents and images
- Upload care plans, licences, receipts, timesheets (Supabase Storage).
- Attach to a home, a caregiver or a date.
- Download/export.
- Claude vision reads uploaded images.

### 3.7 Memory
- Tello recalls past decisions, past schedules and their outcomes.
- Currently every request starts cold — feed history into the prompt.

---

## 4. ARCHITECTURE

```
React 19 + Vite 7  →  Cloudflare Pages (auto-deploys from main)
        │
        ├── /api/*   Pages Functions (functions/api/*.js)  → Claude
        │            shared/tello-claude.js is the single source of truth;
        │            worker-index.js reuses it for standalone deployment
        │
        └── Supabase nwlhsshvqmbhemhxcran — auth, data, storage
```

Model: `claude-haiku-4-5` (~half a cent per analysis).

Existing tables: `tello_businesses`, `tello_decisions`, `tello_decision_images`,
`tello_decision_history`, `tello_decision_outcomes`, `tello_decision_templates`,
`tello_alerts`, `tello_vault_snapshots`, `tello_github_integrations`.

New tables needed:
```sql
tello_homes         (id, business_id, name, address, need_day, need_night, license_no, license_expires)
tello_caregivers    (id, business_id, name, role, home_id, phone, hourly_rate, cert_expires)
tello_shifts        (id, home_id, caregiver_id, date, slot, hours, status)
tello_time_off      (id, caregiver_id, date, reason, status, requested_at)
tello_timesheets    (id, caregiver_id, period_start, period_end, hours, adjustments, approved)
tello_grocery_items (id, home_id, item, qty, recurring, bought_at)
tello_reminders     (id, business_id, title, due_date, kind, done, related_id)
tello_documents     (id, business_id, home_id, caregiver_id, storage_path, kind, uploaded_at)
```
Every table: enable RLS, policy scoped through `business_id` to `auth.uid()`.

New endpoint: `POST /api/schedule` — takes the current roster plus the request,
returns ranked options with trade-offs and a recommendation. Same structured
JSON contract as `/analyze`.

---

## 5. GOTCHAS ALREADY PAID FOR — READ THIS

1. **`VITE_` prefix decides exposure, not the "Secret" toggle.** Vite inlines
   every `VITE_*` var into the browser bundle. `ANTHROPIC_API_KEY` must have
   **no prefix** — unprefixed vars reach Pages Functions only. Marking a
   `VITE_*` var as Secret does NOT protect it.
2. **Supabase project URLs end `.supabase.co`, never `.com`.** A `.com` typo
   fails at DNS and surfaces as "Load failed" in Safari, which looks like the
   service is down. The code now auto-corrects it and warns.
3. **Env var changes need a redeploy.** `VITE_*` values are baked at build time.
4. **Node is pinned** in `.node-version` (22.16.0) — Vite 7 needs ≥22.12.
5. **`@vitejs/plugin-react@6` requires Vite 8.** On Vite 7, pin the plugin to v5.
6. **Supabase's built-in email is rate-limited** to a few per hour. Password
   resets and confirmations often never arrive. For testing, turn off
   "Confirm email" or set the password from Authentication → Users. For
   production, configure SMTP (Resend) and verify the sender domain.
7. **Don't pass a callback that closes over stale state to Auth.** A previous
   `onAuthSuccess={() => setSession(session)}` reset the session to `null`
   immediately after a successful sign-in — login appeared to do nothing.
8. **Non-OK Anthropic responses must throw.** Parsing them as success turned an
   invalid API key into "Unable to analyze decision", which looks like a model
   failure. Surface the real error.
9. **Read image media type from the data URI.** Hardcoding `image/jpeg` makes
   every PNG upload fail.
10. **Guard array fields.** `images.length` on an absent field threw a 500.
11. **Ask Claude for JSON, but parse defensively.** Use a brace-matching
    extractor that ignores braces inside strings, scrub wrong types, clamp
    numbers, and fall back to showing the prose. Never let a bad reply 500.
12. **Cloudflare Pages logs a wrangler.toml warning** ("no pages_build_output_dir").
    Harmless — that file is for the optional standalone Worker.
13. **Artifacts on this account cannot call Claude.** Available capabilities are
    `artifact`, `downloads`, `mcp`, `self` only. Anything needing Claude must
    live in the app.
14. **If an artifact rewrites its own page, never escape `</` in stored HTML.**
    It corrupts the markup on the next save and destroys the data. Keep the
    shell as a JS string constant. Verify by generating the page 5× from its own
    output and diffing the bytes.

---

## 6. BUILD ORDER

1. **Unblock the key.** `/?diag=1`, fix whatever it names. Nothing else matters
   until Ask Tello returns real text.
2. **Schedule data model** — the 8 tables above, with RLS.
3. **Coverage board in the app** — port the artifact's logic; gap detection first.
4. **`/api/schedule`** — Tello suggests cover, with the roster in the prompt.
5. **Time off → suggestion loop** — the moment it becomes a co-pilot.
6. **Timesheets** from assignments, with CSV export.
7. **Grocery lists**, receipt photos via `/vision`.
8. **Reminders + the alerts job** — write to `tello_alerts`.
9. **Documents** — Supabase Storage upload/download.
10. **Memory** — past schedules and outcomes into every prompt.

---

## 7. DONE MEANS

- She opens it on her phone and sees every uncovered shift for the next two weeks.
- She types "Grace needs Friday off" and gets ranked options with trade-offs.
- Approving time off warns her before it opens a hole.
- Timesheets export for payroll without retyping.
- She stops keeping the schedule in her head.

Ship in that order. Verify each step against the live deployment before moving
on — this project has repeatedly looked finished while being invisibly broken.
