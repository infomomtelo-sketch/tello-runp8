import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle2, Clock, Lock } from 'lucide-react';

function ShareView() {
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const shareToken = new URLSearchParams(window.location.search).get('share');

  useEffect(() => {
    if (!shareToken) {
      setError('No share token in this link.');
      setLoading(false);
      return;
    }
    loadDecision();
  }, [shareToken]);

  const loadDecision = async () => {
    try {
      // Reads through a SECURITY DEFINER function (see tello-schema-phase3.sql) so a
      // caller can only fetch the one decision whose token they already hold.
      const { data, error: loadError } = await supabase.rpc('get_shared_decision', {
        p_share_token: shareToken,
      });

      if (loadError) throw loadError;
      if (!data || data.length === 0) {
        setError('This decision is no longer shared, or the link is invalid.');
        return;
      }
      setDecision(data[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-xs space-y-3">
          <div className="scanner" />
          <p className="label text-center">Resolving link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="panel p-8 max-w-sm w-full text-center animate-fade-up">
          <AlertCircle className="text-rose mx-auto mb-4" size={26} />
          <h1 className="text-lg font-semibold text-white mb-2">Can't open this decision</h1>
          <p className="text-sm text-dim">{error}</p>
        </div>
      </div>
    );
  }

  const options = Array.isArray(decision.options) ? decision.options : [];

  return (
    <div className="min-h-screen">
      <nav className="border-b border-edge bg-hull/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-white tracking-tight">Tello</span>
          <span className="pip text-faint">
            <Lock size={11} />
            read only
          </span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-5 space-y-5 animate-fade-up">
        <div className="panel p-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-white">{decision.title}</h1>
            <span className={`pip shrink-0 ${decision.decision ? 'text-emerald' : 'text-amber'}`}>
              {decision.decision ? <CheckCircle2 size={13} /> : <Clock size={13} />}
              {decision.decision ? 'resolved' : 'open'}
            </span>
          </div>
          <p className="readout text-[11px] text-faint mt-2">
            {new Date(decision.created_at).toLocaleString()}
          </p>
          {decision.context && (
            <p className="text-dim mt-4 whitespace-pre-wrap leading-relaxed">{decision.context}</p>
          )}
        </div>

        {options.length > 0 && (
          <div className="panel overflow-hidden">
            <div className="px-5 py-3 border-b border-edge">
              <span className="label text-ink">Options considered</span>
            </div>
            <ul className="divide-y divide-edge">
              {options.map((option, index) => (
                <li key={index} className="px-5 py-3 flex gap-3">
                  <span className="readout text-[11px] text-faint pt-0.5">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-ink text-sm">
                    {typeof option === 'string' ? option : JSON.stringify(option)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {decision.reasoning && (
          <div className="panel overflow-hidden">
            <div className="px-5 py-3 border-b border-edge">
              <span className="label text-ink">Tello's analysis</span>
            </div>
            <p className="p-5 text-ink leading-relaxed whitespace-pre-wrap">{decision.reasoning}</p>
          </div>
        )}

        {decision.decision && (
          <div className="panel border-indigo/40 p-6">
            <span className="label text-indigo-bright">Decision</span>
            <p className="text-white mt-3 whitespace-pre-wrap leading-relaxed">
              {decision.decision}
            </p>
            {decision.outcome && (
              <p className="text-sm text-dim mt-4 border-t border-edge pt-4">
                <span className="label">Outcome</span>{' '}
                <span className="ml-2">{decision.outcome}</span>
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default ShareView;
