import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

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
    return <div className="flex items-center justify-center h-screen text-gray-600">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <AlertCircle className="text-red-600 mx-auto mb-4" size={32} />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Can't open this decision</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const options = Array.isArray(decision.options) ? decision.options : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Tello</h1>
          <span className="text-sm text-gray-500">Shared decision — read only</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{decision.title}</h2>
            {decision.decision ? (
              <CheckCircle2 className="text-green-600 flex-shrink-0 ml-4" size={20} />
            ) : (
              <Clock className="text-yellow-600 flex-shrink-0 ml-4" size={20} />
            )}
          </div>
          <p className="text-gray-400 text-xs mt-2">
            {new Date(decision.created_at).toLocaleDateString()}
          </p>
          {decision.context && <p className="text-gray-700 mt-4 whitespace-pre-wrap">{decision.context}</p>}
        </div>

        {options.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Options considered</h3>
            <ul className="space-y-2">
              {options.map((option, index) => (
                <li key={index} className="text-gray-700 p-3 bg-gray-50 rounded">
                  {typeof option === 'string' ? option : JSON.stringify(option)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {decision.reasoning && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tello's Analysis</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{decision.reasoning}</p>
          </div>
        )}

        {decision.decision && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Decision</h3>
            <p className="text-blue-900 whitespace-pre-wrap">{decision.decision}</p>
            {decision.outcome && (
              <p className="text-blue-800 text-sm mt-4">
                <strong>Outcome:</strong> {decision.outcome}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default ShareView;
