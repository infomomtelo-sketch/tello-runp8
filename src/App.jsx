import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import CoreHUD from './components/CoreHUD';
import DecisionConsole from './components/DecisionConsole';
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
    <CoreHUD business={business} view={view} onNavigate={setView}>
      {view === 'dashboard' && business && (
        <Dashboard business={business} onNewDecision={() => setView('decision')} />
      )}
      {view === 'decision' && business && (
        <DecisionConsole business={business} onBack={() => setView('dashboard')} />
      )}
    </CoreHUD>
  );
}

export default App;
