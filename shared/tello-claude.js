// Claude calls shared by the Pages Functions in functions/api/ and the optional
// standalone Worker in index.js, so the two deployment paths cannot drift apart.

const MODEL = 'claude-haiku-4-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const TELLO_IDENTITY = `You are Tello, an AI co-founder and business advisor for solo founders.
You are named after the founder's late mother. Approach every decision with empathy,
pragmatism and first-principles thinking. Be concrete and specific to this business —
never generic advice. Say plainly when there is not enough information to decide.`;

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

// The model is asked for JSON, but a model can still answer in prose. Pull the
// first balanced JSON object out of the reply and fall back to showing the text
// rather than failing the request.
function parseStructured(text) {
  const start = text.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = !inString;
      } else if (!inString && ch === '{') {
        depth += 1;
      } else if (!inString && ch === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}

const asList = (value) =>
  Array.isArray(value) ? value.filter((v) => typeof v === 'string' && v.trim()) : [];

const clampConfidence = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
};

// Normalize whatever came back into the shape the UI renders.
function shapeAnalysis(text) {
  const parsed = parseStructured(text);
  if (!parsed) {
    return { summary: text, pros: [], cons: [], risks: [], next_steps: [], confidence: null };
  }
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : text,
    recommendation: typeof parsed.recommendation === 'string' ? parsed.recommendation : null,
    pros: asList(parsed.pros),
    cons: asList(parsed.cons),
    risks: asList(parsed.risks),
    next_steps: asList(parsed.next_steps),
    confidence: clampConfidence(parsed.confidence),
  };
}

const businessBlock = ({ business_type, revenue, constraints }) => `Business context:
- Type: ${business_type || 'unspecified'}
- Monthly revenue: $${revenue ?? 0}
- Constraints: ${constraints || 'none stated'}`;

const ANALYSIS_CONTRACT = `Reply with a single JSON object and nothing else:
{
  "summary": "2-4 sentences framing the decision and what it turns on",
  "recommendation": "the one option you would take, stated plainly",
  "pros": ["..."],
  "cons": ["..."],
  "risks": ["what could go wrong, and the early warning sign for each"],
  "next_steps": ["concrete actions, most urgent first"],
  "confidence": 0-100
}
Keep each list between 2 and 5 items. Set confidence low when the founder has not
given you enough to go on, and say what is missing in the summary.`;

export async function analyzeDecision(apiKey, body) {
  const { context, options, images } = body;
  const visionNotes = (Array.isArray(images) ? images : []).filter(Boolean);

  const userPrompt = `${businessBlock(body)}

Decision context: ${context}

Options being considered:
${options || '(none listed — suggest the options worth weighing)'}${
    visionNotes.length > 0
      ? `\n\nWhat the attached image(s) show:\n${visionNotes.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
      : ''
  }`;

  const data = await callClaude(apiKey, {
    model: MODEL,
    max_tokens: 1600,
    system: `${TELLO_IDENTITY}\n\n${ANALYSIS_CONTRACT}`,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return { analysis: shapeAnalysis(firstText(data, 'Unable to analyze decision')) };
}

export async function chatWithTello(apiKey, body) {
  const { messages, context } = body;
  const turns = Array.isArray(messages) ? messages : [];

  if (turns.length === 0) throw new Error('Missing messages');

  const data = await callClaude(apiKey, {
    model: MODEL,
    max_tokens: 800,
    system: `${TELLO_IDENTITY}

${businessBlock(body)}

The decision under discussion: ${context || '(not yet described)'}

Be conversational and direct. Ask a clarifying question when the answer would
change your advice. Do not repeat the full analysis back — build on it.`,
    messages: turns.map((m) => ({ role: m.role, content: m.content })),
  });

  return { reply: firstText(data, 'Unable to reply') };
}

export async function analyzeImage(apiKey, body) {
  const { image_data, decision_context } = body;

  // Read the media type off the data URI rather than assuming JPEG — a PNG sent
  // as image/jpeg is rejected by the API.
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(image_data || '');
  if (!match) {
    throw new Error('Missing or malformed image_data (expected a base64 image data URI)');
  }
  const [, mediaType, base64] = match;

  const data = await callClaude(apiKey, {
    model: MODEL,
    max_tokens: 700,
    system: `${TELLO_IDENTITY}

You are reading an image the founder attached to a decision. Describe only what is
actually visible and what it implies for the decision. Do not speculate beyond the
image. Answer in 2-4 sentences.`,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: decision_context
              ? `This relates to the decision: ${decision_context}\n\nWhat does this image tell me?`
              : 'What does this image tell me about the business decision at hand?',
          },
        ],
      },
    ],
  });

  return { analysis: firstText(data, 'Unable to analyze image') };
}

// Re-examines a decision that already has an analysis, against whatever the
// business context looks like now (and an Obsidian vault snapshot when present).
export async function reasonOverDecision(apiKey, body) {
  const { decision_id, title, context, options, prior_analysis, outcome, vault_context } = body;

  if (!context && !title) throw new Error('Missing decision to reason about');

  const userPrompt = `${businessBlock(body)}

Decision: ${title || '(untitled)'}
Context: ${context || '(none)'}
Options:
${options || '(none listed)'}

Earlier analysis:
${prior_analysis || '(none recorded)'}
${outcome ? `\nRecorded outcome so far: ${outcome}` : ''}
${vault_context ? `\nNotes from the founder's vault:\n${vault_context}` : ''}

Re-examine this decision against the context above. State what has changed, whether
the earlier recommendation still holds, and what you would do now.`;

  const data = await callClaude(apiKey, {
    model: MODEL,
    max_tokens: 1600,
    system: `${TELLO_IDENTITY}\n\n${ANALYSIS_CONTRACT}

This is a re-examination, not a first look. In "summary", lead with what changed
since the earlier analysis, and say plainly if nothing has.`,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return {
    decision_id: decision_id || null,
    analysis: shapeAnalysis(firstText(data, 'Unable to re-examine decision')),
  };
}
