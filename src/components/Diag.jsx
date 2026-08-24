import { useEffect, useState } from 'react';

// Temporary connectivity check, reachable at /?diag=1. Shows what the build
// actually baked in and what Supabase returns, so a failure can be told apart
// from a bad key, a blocked request, or a wrong URL.
function Diag() {
  const [lines, setLines] = useState(['running...']);

  const rawUrl = import.meta.env.VITE_SUPABASE_URL;
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    const url = (rawUrl || '').trim().replace(/\/+$/, '');
    const key = (rawKey || '').replace(/\s/g, '');
    const out = [];

    const show = (label, value) => out.push(`${label}: ${value}`);

    show('URL', url || '(EMPTY — not set in Pages)');
    show('key length', key.length || '(EMPTY — not set in Pages)');
    show('key starts', key.slice(0, 12) || '-');
    show('key ends', key.slice(-6) || '-');
    show('key looks like a JWT', key.split('.').length === 3 ? 'yes' : 'NO — wrong value');
    show('raw key had whitespace', (rawKey || '').length !== key.length ? 'YES' : 'no');

    const probe = async (label, path, headers) => {
      try {
        const res = await fetch(`${url}${path}`, { headers });
        const body = await res.text();
        show(label, `HTTP ${res.status} — ${body.slice(0, 160)}`);
      } catch (err) {
        show(label, `THREW ${err.name}: ${err.message}`);
      }
    };

    // The call that has never worked: the Pages Function that talks to Claude.
    const probeApi = async () => {
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: 'diagnostic ping',
            options: 'a or b',
            business_type: 'saas',
            revenue: 0,
            constraints: 'none',
            images: [],
          }),
        });
        const body = await res.text();

        if (res.status === 404) {
          show('/api/analyze', 'HTTP 404 — Pages Functions did not deploy');
        } else if (body.includes('Missing ANTHROPIC_API_KEY')) {
          show('/api/analyze', 'HTTP 500 — ANTHROPIC_API_KEY not set on this deployment');
        } else if (body.includes('invalid x-api-key') || body.includes('authentication_error')) {
          show('/api/analyze', 'HTTP 500 — the API key is set but rejected by Anthropic');
        } else {
          show('/api/analyze', `HTTP ${res.status} — ${body.slice(0, 220)}`);
        }
      } catch (err) {
        show('/api/analyze', `THREW ${err.name}: ${err.message}`);
      }
    };
