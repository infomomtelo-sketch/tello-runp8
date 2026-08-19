// tello_decisions.reasoning holds text. Structured analyses are stored as JSON in
// that column, so reads must cope with both those and older plain-text rows.

export const EMPTY_ANALYSIS = {
  summary: '',
  recommendation: null,
  pros: [],
  cons: [],
  risks: [],
  next_steps: [],
  confidence: null,
};

const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : []);

export function readAnalysis(value) {
  if (!value) return null;
  if (typeof value === 'object') return { ...EMPTY_ANALYSIS, ...value };

  const text = String(value);
  if (text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      return {
        ...EMPTY_ANALYSIS,
        ...parsed,
        pros: list(parsed.pros),
        cons: list(parsed.cons),
        risks: list(parsed.risks),
        next_steps: list(parsed.next_steps),
      };
    } catch {
      // fall through to plain text
    }
  }
  return { ...EMPTY_ANALYSIS, summary: text };
}

export const writeAnalysis = (analysis) => (analysis ? JSON.stringify(analysis) : null);

// Flattened form used for text-to-speech and for feeding a prior analysis back
// into /reason.
export function analysisToText(analysis) {
  if (!analysis) return '';
  const section = (label, items) => (items.length ? `${label}: ${items.join('. ')}.` : '');
  return [
    analysis.summary,
    analysis.recommendation ? `Recommendation: ${analysis.recommendation}.` : '',
    section('Pros', analysis.pros),
    section('Cons', analysis.cons),
    section('Risks', analysis.risks),
    section('Next steps', analysis.next_steps),
    analysis.confidence != null ? `Confidence: ${analysis.confidence} percent.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}
