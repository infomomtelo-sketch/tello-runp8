import { AlertTriangle, ListChecks, Minus, Plus, Target } from 'lucide-react';

function Meter({ value }) {
  const tone = value >= 70 ? 'bg-emerald' : value >= 40 ? 'bg-amber' : 'bg-rose';
  const text = value >= 70 ? 'text-emerald' : value >= 40 ? 'text-amber' : 'text-rose';
  return (
    <div className="flex items-center gap-3">
      <span className="label">Confidence</span>
      <div className="h-1 w-24 bg-edge rounded-full overflow-hidden">
        <div
          className={`h-full ${tone} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`readout text-xs ${text}`}>{String(value).padStart(2, '0')}%</span>
    </div>
  );
}

function Findings({ icon: Icon, title, items, tone }) {
  if (!items.length) return null;
  return (
    <div>
      <div className={`pip mb-3 ${tone}`}>
        <Icon size={12} />
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-ink leading-relaxed">
            <span className="readout text-[10px] text-faint pt-1 shrink-0">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisReport({ analysis }) {
  if (!analysis) return null;

  const hasStructure =
    analysis.pros.length ||
    analysis.cons.length ||
    analysis.risks.length ||
    analysis.next_steps.length;

  return (
    <div className="space-y-6">
      {analysis.summary && (
        <p className="text-ink leading-relaxed whitespace-pre-wrap">{analysis.summary}</p>
      )}

      {analysis.recommendation && (
        <div className="border-l-2 border-indigo-bright bg-indigo/10 rounded-r-md p-4">
          <div className="pip text-indigo-bright mb-2">
            <Target size={12} />
            Recommendation
          </div>
          <p className="text-white leading-relaxed">{analysis.recommendation}</p>
        </div>
      )}

      {analysis.confidence != null && <Meter value={analysis.confidence} />}

      {hasStructure && (
        <div className="grid sm:grid-cols-2 gap-6 pt-2">
          <Findings icon={Plus} title="For" items={analysis.pros} tone="text-emerald" />
          <Findings icon={Minus} title="Against" items={analysis.cons} tone="text-dim" />
          <Findings icon={AlertTriangle} title="Risks" items={analysis.risks} tone="text-amber" />
          <Findings
            icon={ListChecks}
            title="Next steps"
            items={analysis.next_steps}
            tone="text-cyan"
          />
        </div>
      )}
    </div>
  );
}

export default AnalysisReport;
