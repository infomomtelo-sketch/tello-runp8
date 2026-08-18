// Minimal JSON plumbing shared by the Pages Functions.

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Wraps a shared/tello-claude.js handler as a Pages Function. Same-origin, so no
// CORS headers are needed here.
export const pagesHandler = (run) => async ({ request, env }) => {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'Missing ANTHROPIC_API_KEY' }, 500);
  }

  try {
    return json(await run(env.ANTHROPIC_API_KEY, await request.json()));
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
