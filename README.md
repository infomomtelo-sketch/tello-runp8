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

Paste the whole of **`tello-schema-all.sql`** into the Supabase SQL editor and Run.
It contains Phases 1-3 and is safe to run more than once.

The final row should read `tello_tables = 9` and `share_function = 1`.

The individual `tello-schema-phase{1,2,3}.sql` files are kept for reference; the
combined file is equivalent.

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

### 4. **API (Cloudflare Pages Functions)**

The API ships with the site — no separate Worker to set up. The three endpoints
live in `functions/api/` and Cloudflare Pages deploys them automatically on every
push, alongside the frontend:

- `POST /api/analyze` — Claude decision analysis
- `POST /api/chat` — multi-turn conversation
- `POST /api/vision` — image analysis

The only manual step is the key. In **Pages → Settings → Environment variables →
Production**, add:

```
ANTHROPIC_API_KEY = sk-ant-...     (type: Secret / Encrypted)
```

**Do not prefix it with `VITE_`.** Vite inlines every `VITE_*` variable into the
browser bundle, which would publish the key. Unprefixed variables are only
visible to Functions, server-side.

Because the API is same-origin (`tello.runp8.com/api/...`), there is no CORS
configuration and no worker URL to keep in sync.

<details>
<summary>Optional: deploying the API as a standalone Worker instead</summary>

`index.js` + `wrangler.toml` deploy the same endpoints as their own Worker,
sharing the identical logic from `shared/tello-claude.js`. Only needed if you
want the API on its own hostname.

```bash
npx wrangler deploy
npx wrangler secret put ANTHROPIC_API_KEY
```

The Worker restricts callers by `Origin` (`ALLOWED_ORIGINS` in `wrangler.toml`),
since it is cross-origin. Note that `Origin` is browser-set and therefore not
authentication — see the security note below.
</details>

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
├── functions/
│   └── api/
│       ├── analyze.js
│       ├── chat.js
│       └── vision.js
├── shared/
│   ├── tello-claude.js  (Claude calls, shared)
│   └── http.js
├── index.js (optional standalone Worker)
├── wrangler.toml
├── .env.example
├── tello-schema-all.sql   (run this one)
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

- [ ] `tello-schema-all.sql` run in Supabase (9 tables + `get_shared_decision`)
- [ ] GitHub repo created & all files uploaded
- [ ] Cloudflare Pages connected to GitHub
- [ ] Environment variables set in Cloudflare Pages (all four `VITE_*`, including
      `VITE_TELLO_DOMAIN` — the app throws on load if Supabase vars are missing)
- [ ] `ANTHROPIC_API_KEY` set in Pages env vars as a Secret, with no `VITE_` prefix
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

## 🔒 Security note on the API

`/api/*` is open to anyone who loads the site — there is no check that the caller
is a signed-in user, so anyone can script requests against it and spend your
Anthropic credits.

If usage or spend becomes a concern, verify the caller's Supabase JWT inside the
Functions (the frontend already holds a session token) and reject requests
without a valid one.

---

## ❓ Support

If you hit issues:
1. Check Supabase logs (Logs → Edge Functions or SQL errors)
2. Check Cloudflare Worker logs (Workers → Logs)
3. Check browser console (Ctrl+Shift+I → Console)

Share token format: `tello://share/TOKEN_HERE`

---

**Made with 💙 for solo founders. Named after your late mother.**
