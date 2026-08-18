# tello-runp8
Tello v2 MVP - AI co-founder for business owners"
# Tello — AI Co-Founder / Business OS

**Tello** is your AI business advisor — named after your late mother. It helps you make critical decisions faster with real-time guidance.

## What's Included

### Frontend (React/Vite)
- **Auth** — Sign up / login via Supabase nwlhs
- **Onboarding** — 5-step business setup wizard
- **Dashboard** — View pending decisions, alerts, logged decisions
- **Decision Panel** — New decision interface with:
  - Voice input (Web Speech API)
  - Image upload + Claude vision analysis
  - Real-time Claude analysis
  - Multi-turn chat with Tello
  - Share links (read-only for advisors)
  - Text-to-speech output
- **Share View** — Public read-only decision sharing

### Backend (Cloudflare Worker)
- `/analyze` — Real Claude decision analysis
- `/chat` — Multi-turn conversation with context
- `/vision` — Image analysis via Claude vision

### Database (Supabase)
- `tello_businesses` — Business metadata
- `tello_decisions` — Decision log with share tokens
- `tello_decision_images` — Image attachments + vision analysis
- `tello_decision_history` — Event log
- `tello_decision_outcomes` — Outcome tracking
- `tello_decision_templates` — Pre-built decision frameworks

---

## 🚀 Quick Start

### 1. **Setup Supabase (nwlhs)**

Run **Phase 1** migration first (in Supabase SQL editor):
```bash
-- Copy entire contents of tello-schema-phase1.sql
-- Paste into Supabase SQL editor
-- Click Run
```

Once Phase 1 is confirmed (6 tables created), run **Phase 2**:
```bash
-- Copy entire contents of tello-schema-phase2.sql
-- Paste into Supabase SQL editor
-- Click Run
```

Verify: Should show **9 total Tello tables** in Supabase.

Finally, run **Phase 3** to enable public share links:
```bash
-- Copy entire contents of tello-schema-phase3.sql
-- Paste into Supabase SQL editor
-- Click Run
```

Verify: the result should show `get_shared_decision` with
`is_security_definer = true` and `anon_can_execute = true`.

Share links read through this function rather than a permissive RLS policy —
the anon key is public, so a table-level "any row with a share_token" policy
would let anyone dump every shared decision. The function only ever returns the
single decision whose token the caller already has.

### 2. **GitHub Setup**

Create repo: `infomomtelo-sketch/tello-runp8` (public)

Upload files via GitHub web UI:
- `package.json`
- `vite.config.js`
- `index.html`
- `main.jsx`
- `App.jsx`
- `Auth.jsx` / `Onboarding.jsx` / `Dashboard.jsx`
- `worker-index.js`
- `wrangler.toml`
- `.env.example`
- `supabase-client.js`

### 3. **Cloudflare Pages (Auto-Deploy)**

1. Go to Cloudflare Pages
2. Connect to GitHub (`infomomtelo-sketch/tello-runp8`)
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL` = `https://nwlhsshvqmbhemhxcran.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (get from Supabase Dashboard)
   - `VITE_TELLO_WORKER_URL` = `https://tello.infomomtelo.workers.dev`
6. Deploy

### 4. **Cloudflare Worker (API)**

`index.js` in the repo root **is** the Worker — `wrangler.toml` already points at it.
Nothing needs to be copied or renamed.

From the repo root:

```bash
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY   # paste your Claude API key when prompted
npx wrangler deploy
```

The worker is named `tello`, so it deploys to `https://tello.infomomtelo.workers.dev`,
matching `VITE_TELLO_WORKER_URL`. Renaming the worker changes that hostname — keep the
two in sync.

The Worker only accepts browser requests from the origins in `ALLOWED_ORIGINS`
(set under `[vars]` in `wrangler.toml`); anything else gets a 403. Add any new
frontend domain there. Note this is a CORS allowlist, not authentication — see
the security note below.

### 5. **Custom Domain**

Add CNAME in your DNS:
```
tello.runp8.com  →  tello-runp8.pages.dev (Cloudflare Pages)
```

---

## 📋 File Structure

```
tello-runp8/
├── package.json
├── vite.config.js
├── index.html
├── main.jsx
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── Auth.jsx
│   │   ├── Onboarding.jsx
│   │   ├── Dashboard.jsx
│   │   ├── DecisionPanelV2.jsx
│   │   └── ShareView.jsx
│   └── lib/
│       └── supabase.js
├── index.js (Cloudflare Worker)
├── wrangler.toml
├── .env.example
├── tello-schema-phase1.sql
├── tello-schema-phase2.sql
└── tello-schema-phase3.sql
```

---

## 🔑 Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://nwlhsshvqmbhemhxcran.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_TELLO_WORKER_URL=https://tello.infomomtelo.workers.dev
VITE_TELLO_DOMAIN=https://tello.runp8.com
```

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## ⚙️ Deployment Checklist

- [ ] Supabase Phase 1 & 2 migrations complete (9 tables visible)
- [ ] Supabase Phase 3 migration complete (`get_shared_decision` function exists)
- [ ] GitHub repo created & all files uploaded
- [ ] Cloudflare Pages connected to GitHub
- [ ] Environment variables set in Cloudflare Pages (all four `VITE_*`, including
      `VITE_TELLO_DOMAIN` — the app throws on load if Supabase vars are missing)
- [ ] Cloudflare Worker deployed to `tello.infomomtelo.workers.dev`
- [ ] `ANTHROPIC_API_KEY` secret set in Worker (`wrangler secret put`, never in `[vars]`)
- [ ] `ALLOWED_ORIGINS` in `wrangler.toml` covers every domain the frontend is served from
- [ ] Custom domain `tello.runp8.com` configured in DNS
- [ ] End-to-end test:
  - Sign up → Create business → Log decision → Share link

---

## 🎯 Next Steps

1. **Vault Sync** — Connect Obsidian vault for context
2. **GitHub Watch** — Pre-deploy decision checklist automation
3. **Templates** — More decision frameworks (hiring, fundraising, etc.)
4. **Outcomes** — Track decision results and refine Tello's guidance
5. **Mobile** — React Native version for on-the-go decisions

---

## 🔒 Security note on the Worker

The Worker restricts requests by `Origin`, which stops other websites from
spending your Anthropic credits via a visitor's browser. It is **not**
authentication: `Origin` is set by the browser, so a direct request from curl or
any server-side script can present whatever origin it likes. Anyone who learns
the Worker URL can still call it.

If usage or spend becomes a concern, the real fix is to verify the caller's
Supabase JWT inside the Worker (the frontend already holds a session token) and
reject requests without a valid one.

---

## ❓ Support

If you hit issues:
1. Check Supabase logs (Logs → Edge Functions or SQL errors)
2. Check Cloudflare Worker logs (Workers → Logs)
3. Check browser console (Ctrl+Shift+I → Console)

Share token format: `tello://share/TOKEN_HERE`

---

**Made with 💙 for solo founders. Named after your late mother.**
