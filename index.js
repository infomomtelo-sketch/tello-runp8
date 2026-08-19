// Tello Cloudflare Worker — OPTIONAL standalone deployment.
// The app is served by the Pages Functions in functions/api/; this file exists
// for deploying the same API as its own Worker. Both share shared/tello-claude.js.

import {
  analyzeDecision,
  chatWithTello,
  analyzeImage,
  reasonOverDecision,
} from './shared/tello-claude.js';

// Browser origins allowed to call this Worker. Override with the ALLOWED_ORIGINS
// var (comma-separated) in wrangler.toml or the dashboard.
const DEFAULT_ALLOWED_ORIGINS = ['https://tello.runp8.com', 'http://localhost:3000'];

function resolveAllowedOrigins(env) {
  const configured = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function buildCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Allowlist rather than '*': a wildcard lets any page on the web spend this
    // Worker's Anthropic credits from a visitor's browser.
    const origin = request.headers.get('Origin');
    const isAllowedOrigin =
      Boolean(origin) && resolveAllowedOrigins(env).includes(origin.replace(/\/+$/, ''));

    if (!isAllowedOrigin) {
      return new Response(
        request.method === 'OPTIONS' ? null : JSON.stringify({ error: 'Origin not allowed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const corsHeaders = buildCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      if (path === '/analyze' && request.method === 'POST') {
        return await respond(analyzeDecision, request, apiKey, corsHeaders);
      } else if (path === '/chat' && request.method === 'POST') {
        return await respond(chatWithTello, request, apiKey, corsHeaders);
      } else if (path === '/vision' && request.method === 'POST') {
        return await respond(analyzeImage, request, apiKey, corsHeaders);
      } else if (path === '/reason' && request.method === 'POST') {
        return await respond(reasonOverDecision, request, apiKey, corsHeaders);
      } else {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

async function respond(run, request, apiKey, corsHeaders) {
  const data = await run(apiKey, await request.json());
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
