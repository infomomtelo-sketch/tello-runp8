import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import DecisionPanelV2 from './components/DecisionPanelV2';
import ShareView from './components/ShareView';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [view, setView] = useState('dashboard');
  const [selectedDecision, setSelectedDecision] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadBusiness();
    }
  }, [session]);

  const loadBusiness = async () => {
    const { data, error } = await supabase
      .from('tello_businesses')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (data) setBusiness(data);
    if (error && error.code !== 'PGRST116') console.error(error);
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!session) return <Auth onAuthSuccess={() => setSession(session)} />;

  // Check if business exists
  if (!business && view !== 'onboarding') {
    return <Onboarding onComplete={(b) => { setBusiness(b); setView('dashboard'); }} />;
  }

  // Share view (public, no auth required — handle separately)
  if (view === 'share') {
    return <ShareView />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Tello</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setView('dashboard')}
              className={`px-4 py-2 rounded ${view === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setView('decision')}
              className={`px-4 py-2 rounded ${view === 'decision' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
            >
              New Decision
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 text-gray-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        {view === 'dashboard' && business && (
          <Dashboard business={business} onNewDecision={() => setView('decision')} />
        )}
        {view === 'decision' && business && (
          <DecisionPanelV2 business={business} onBack={() => setView('dashboard')} />
        )}
      </main>
    </div>
  );
}

export default App;
