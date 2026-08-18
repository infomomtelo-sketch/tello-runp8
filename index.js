// Tello Cloudflare Worker
// Deploy to tello.infomomtelo.workers.dev

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

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
        return await handleAnalyze(request, apiKey, corsHeaders);
      } else if (path === '/chat' && request.method === 'POST') {
        return await handleChat(request, apiKey, corsHeaders);
      } else if (path === '/vision' && request.method === 'POST') {
        return await handleVision(request, apiKey, corsHeaders);
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

async function handleAnalyze(request, apiKey, corsHeaders) {
  const body = await request.json();
  const { context, options, business_type, revenue, constraints, images } = body;

  const systemPrompt = `You are Tello, an AI co-founder and business advisor. You help solo founders make critical business decisions.
You are named after the user's late mother. Approach every decision with empathy, pragmatism, and first-principles thinking.

User's business context:
- Type: ${business_type}
- Monthly Revenue: $${revenue}
- Constraints: ${constraints}

Provide clear, actionable analysis with pros/cons, risks, and next steps.`;

  const userPrompt = `Decision Context: ${context}\n\nOptions being considered:\n${options}${
    images.length > 0 ? `\n\nAttached images: ${images.length} image(s)` : ''
  }\n\nAnalyze this decision and provide guidance.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    }),
  });

  const data = await response.json();
  const analysis =
    data.content && data.content[0] ? data.content[0].text : 'Unable to analyze decision';

  return new Response(JSON.stringify({ analysis }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleChat(request, apiKey, corsHeaders) {
  const body = await request.json();
  const { messages, context, business_type } = body;

  const systemPrompt = `You are Tello, an AI co-founder advisor. You help solo founders think through decisions.
Current decision context: ${context}
Business type: ${business_type}

Be conversational, empathetic, and direct. Ask clarifying questions or offer perspective based on first-principles thinking.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      system: systemPrompt,
    }),
  });

  const data = await response.json();
  const reply =
    data.content && data.content[0] ? data.content[0].text : 'Unable to reply';

  return new Response(JSON.stringify({ reply }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleVision(request, apiKey, corsHeaders) {
  const body = await request.json();
  const { image_data } = body;

  if (!image_data) {
    return new Response(JSON.stringify({ error: 'Missing image_data' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image_data.split(',')[1], // Remove data URI prefix
              },
            },
            {
              type: 'text',
              text: 'Analyze this image in the context of a business decision. What do you see? What insights might this provide?',
            },
          ],
        },
      ],
      system: 'You are Tello, a business advisor helping analyze visual information for decision-making.',
    }),
  });

  const data = await response.json();
  const analysis =
    data.content && data.content[0] ? data.content[0].text : 'Unable to analyze image';

  return new Response(JSON.stringify({ analysis }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
