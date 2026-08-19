import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { readAnalysis } from '../lib/analysis';
import { AlertCircle, CheckCircle2, Circle, Clock, Plus, Radio, XCircle } from 'lucide-react';

const money = (cents) => `$${((cents || 0) / 100).toLocaleString()}`;

const OUTCOME_STYLE = {
  success: { icon: CheckCircle2, tone: 'text-emerald', label: 'worked' },
  partial: { icon: AlertCircle, tone: 'text-amber', label: 'mixed' },
  failed: { icon: XCircle, tone: 'text-rose', label: 'did not work' },
};

function Stat({ label, value, accent = 'text-cyan' }) {
  return (
    <div className="panel p-4">
      <p className="label">{label}</p>
      <p className={`font-mono tabular-nums text-2xl mt-2 ${accent}`}>{value}</p>
    </div>
  );
}

// One node on the vertical decision timeline.
function TimelineEntry({ decision, last }) {
  const analysis = readAnalysis(decision.reasoning);
  const outcome = OUTCOME_STYLE[decision.outcome];
  const resolved = Boolean(decision.decision);
  const Icon = outcome?.icon || (resolved ? CheckCircle2 : Circle);
  const tone = outcome?.tone || (resolved ? 'text-indigo-bright' : 'text-faint');

  return (
    <li className="relative pl-8 pb-6">
      {!last && <span className="absolute left-[7px] top-5 bottom-0 w-px bg-edge" />}
      <Icon size={15} className={`absolute left-0 top-0.5 ${tone}`} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-ink">{decision.title}</h3>
        <span className="readout text-[11px] text-faint">
          {new Date(decision.created_at).toLocaleDateString()}
        </span>
      </div>

      {decision.context && (
        <p className="text-sm text-dim mt-1 line-clamp-2">{decision.context}</p>
      )}

      {decision.decision && (
        <p className="mt-2 text-sm text-cyan border-l-2 border-cyan/50 pl-3">{decision.decision}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
        <span className={`pip ${resolved ? 'text-indigo-bright' : 'text-amber'}`}>
          {resolved ? <CheckCircle2 size={11} /> : <Clock size={11} />}
          {resolved ? 'analyzed' : 'open'}
        </span>
        {analysis?.confidence != null && (
          <span className="pip text-faint">confidence {analysis.confidence}%</span>
        )}
        {outcome && (
          <span className={`pip ${outcome.tone}`}>
            <outcome.icon size={11} />
            {outcome.label}
          </span>
        )}
      </div>
    </li>
  );
}

function Dashboard({ business, onNewDecision }) {
  const [decisions, setDecisions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncedAt, setSyncedAt] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [business.id]);

  const loadData = async () => {
    try {
      const { data: decisionsData, error: decisionsError } = await supabase
        .from('tello_decisions')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      if (decisionsError) throw decisionsError;
      setDecisions(decisionsData || []);

      const { data: alertsData, error: alertsError } = await supabase
        .from('tello_alerts')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      setSyncedAt(new Date());
    } finally {
      setLoading(false);
    }
  };

  const markAlertRead = async (alertId) => {
    await supabase.from('tello_alerts').update({ is_read: true }).eq('id', alertId);
    loadData();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="scanner" />
        <p className="label">Establishing link...</p>
      </div>
    );
  }

  const resolved = decisions.filter((d) => d.decision).length;
  const tracked = decisions.filter((d) => d.outcome).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{business.name}</h1>
          <p className="text-dim mt-1">{business.description}</p>
        </div>
        <div className="pip text-faint">
          <Radio size={12} className="text-emerald animate-breathe" />
          {syncedAt ? `synced ${syncedAt.toLocaleTimeString()}` : 'syncing'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Monthly revenue" value={money(business.monthly_revenue)} />
        <Stat label="Decisions" value={String(decisions.length).padStart(2, '0')} />
        <Stat label="Analyzed" value={String(resolved).padStart(2, '0')} accent="text-indigo-bright" />
        <Stat
          label="Outcomes logged"
          value={String(tracked).padStart(2, '0')}
          accent={tracked ? 'text-emerald' : 'text-faint'}
        />
      </div>

      {alerts.length > 0 && (
        <div className="panel border-amber/30 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={14} className="text-amber" />
            <span className="label text-amber">Pending alerts</span>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-4 bg-hull border border-edge rounded-md p-3"
              >
                <p className="text-sm text-ink">{alert.message}</p>
                <button
                  onClick={() => markAlertRead(alert.id)}
                  className="label text-indigo-bright hover:text-white shrink-0"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onNewDecision} className="btn-primary w-full sm:w-auto">
        <Plus size={16} />
        New decision
      </button>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-edge">
          <span className="label text-ink">Decision timeline</span>
          <span className="readout text-[11px] text-faint">
            {String(decisions.length).padStart(3, '0')} records
          </span>
        </div>

        {decisions.length === 0 ? (
          <p className="p-8 text-center text-dim text-sm">
            No decisions logged. Create one to get started.
          </p>
        ) : (
          <ul className="p-5">
            {decisions.map((decision, i) => (
              <TimelineEntry
                key={decision.id}
                decision={decision}
                last={i === decisions.length - 1}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
