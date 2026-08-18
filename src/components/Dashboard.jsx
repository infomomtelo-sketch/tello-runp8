import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

function Dashboard({ business, onNewDecision }) {
  const [decisions, setDecisions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [business.id]);

  const loadData = async () => {
    try {
      // Load decisions
      const { data: decisionsData, error: decisionsError } = await supabase
        .from('tello_decisions')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (decisionsError) throw decisionsError;
      setDecisions(decisionsData || []);

      // Load alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('tello_alerts')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);
    } finally {
      setLoading(false);
    }
  };

  const markAlertRead = async (alertId) => {
    await supabase
      .from('tello_alerts')
      .update({ is_read: true })
      .eq('id', alertId);
    loadData();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
        <p className="text-gray-600 mt-2">{business.description}</p>
        <div className="mt-4 flex gap-4">
          <div>
            <p className="text-gray-500 text-sm">Monthly Revenue</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(business.monthly_revenue / 100).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            Pending Alerts
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-white p-4 rounded flex justify-between items-start">
                <p className="text-gray-700">{alert.message}</p>
                <button
                  onClick={() => markAlertRead(alert.id)}
                  className="text-blue-600 text-sm font-semibold hover:underline"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onNewDecision}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          New Decision
        </button>
        <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200">
          View Templates
        </button>
      </div>

      {/* Recent Decisions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Decisions</h2>
        </div>
        {decisions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No decisions yet. Create one to get started!
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {decisions.slice(0, 10).map((decision) => (
              <div key={decision.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{decision.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{decision.context}</p>
                    {decision.decision && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-900">
                        <strong>Decision:</strong> {decision.decision}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    {decision.decision ? (
                      <CheckCircle2 className="text-green-600" size={20} />
                    ) : (
                      <Clock className="text-yellow-600" size={20} />
                    )}
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-4">
                  {new Date(decision.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
