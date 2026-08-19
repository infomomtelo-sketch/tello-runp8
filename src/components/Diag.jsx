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

    (async () => {
      await probe('no-key probe', '/rest/v1/', {});
      await probe('with-key probe', '/auth/v1/settings', { apikey: key });
      setLines([...out]);
    })();
  }, [rawUrl, rawKey]);

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, wordBreak: 'break-all' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Tello diagnostics</h1>
      {lines.map((line, i) => (
        <div key={i} style={{ marginBottom: 8 }}>{line}</div>
      ))}
    </div>
  );
}

export default Diag;
