import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import DecisionPanelV2 from './components/DecisionPanelV2';
import ShareView from './components/ShareView';
import Diag from './components/Diag';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [view, setView] = useState(
    new URLSearchParams(window.location.search).has('share') ? 'share' : 'dashboard'
  );
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

  // Diagnostics (public) — must run before anything that touches Supabase.
  if (new URLSearchParams(window.location.search).has('diag')) return <Diag />;

  // Share view (public, no auth required — handled before the auth gate)
  if (view === 'share') return <ShareView />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-48 space-y-3">
          <div className="scanner" />
          <p className="label text-center">Initializing</p>
        </div>
      </div>
    );
  }

  // No onAuthSuccess handler: onAuthStateChange above already sets the session.
  // Passing one that closes over `session` reset it to null right after sign-in.
  if (!session) return <Auth />;

  // Check if business exists
  if (!business && view !== 'onboarding') {
    return <Onboarding onComplete={(b) => { setBusiness(b); setView('dashboard'); }} />;
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-edge bg-hull/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-breathe" />
            <span className="text-xl font-bold text-white tracking-tight">Tello</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setView('dashboard')}
              className={`label px-3 py-1.5 rounded transition-colors ${
                view === 'dashboard' ? 'bg-indigo text-white' : 'text-dim hover:text-ink'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setView('decision')}
              className={`label px-3 py-1.5 rounded transition-colors ${
                view === 'decision' ? 'bg-indigo text-white' : 'text-dim hover:text-ink'
              }`}
            >
              New decision
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="label px-3 py-1.5 text-faint hover:text-rose transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-5">
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
