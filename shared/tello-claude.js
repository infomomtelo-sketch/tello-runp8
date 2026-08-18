// Claude calls shared by the Pages Functions in functions/api/ and the optional
// standalone Worker in index.js, so the two deployment paths cannot drift apart.

const MODEL = 'claude-haiku-4-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(apiKey, body) {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  // Surface the real reason (bad key, rate limit) instead of a generic
  // "Unable to analyze" string that looks like a model failure.
  if (!response.ok) {
    throw new Error(data?.error?.message || `Claude API error (${response.status})`);
  }

  return data;
}

const firstText = (data, fallback) =>
  data.content && data.content[0] && data.content[0].text ? data.content[0].text : fallback;

export async function analyzeDecision(apiKey, body) {
  const { context, options, business_type, revenue, constraints, images } = body;
  const visionNotes = (Array.isArray(images) ? images : []).filter(Boolean);

  const systemPrompt = `You are Tello, an AI co-founder and business advisor. You help solo founders make critical business decisions.
You are named after the user's late mother. Approach every decision with empathy, pragmatism, and first-principles thinking.

User's business context:
- Type: ${business_type}
- Monthly Revenue: $${revenue}
- Constraints: ${constraints}

Provide clear, actionable analysis with pros/cons, risks, and next steps.`;

  const userPrompt = `Decision Context: ${context}

Options being considered:
${options}${
    visionNotes.length > 0
      ? `\n\nWhat the attached image(s) show:\n${visionNotes.map((note, i) => `${i + 1}. ${note}`).join('\n')}`
      : ''
  }

Analyze this decision and provide guidance.`;

  const data = await callClaude(apiKey, {
    model: MODEL,
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return { analysis: firstText(data, 'Unable to analyze decision') };
}

export async function chatWithTello(apiKey, body) {
  const { messages, context, business_type } = body;
  const turns = Array.isArray(messages) ? messages : [];

  if (turns.length === 0) {
    throw new Error('Missing messages');
  }

  const systemPrompt = `You are Tello, an AI co-founder advisor. You help solo founders think through decisions.
Current decision context: ${context}
Business type: ${business_type}

Be conversational, empathetic, and direct. Ask clarifying questions or offer perspective based on first-principles thinking.`;

  const data = await callClaude(apiKey, {
    model: MODEL,
    max_tokens: 500,
    system: systemPrompt,
    messages: turns.map((message) => ({ role: message.role, content: message.content })),
  });

  return { reply: firstText(data, 'Unable to reply') };
}

export async function analyzeImage(apiKey, body) {
  const { image_data } = body;

  // Read the media type off the data URI rather than assuming JPEG — a PNG sent
  // as image/jpeg is rejected by the API.
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(image_data || '');
  if (!match) {
    throw new Error('Missing or malformed image_data (expected a base64 image data URI)');
  }
  const [, mediaType, base64] = match;

  const data = await callClaude(apiKey, {
    model: MODEL,
    max_tokens: 500,
    system: 'You are Tello, a business advisor helping analyze visual information for decision-making.',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: 'Analyze this image in the context of a business decision. What do you see? What insights might this provide?',
          },
        ],
      },
    ],
  });

  return { analysis: firstText(data, 'Unable to analyze image') };
}
