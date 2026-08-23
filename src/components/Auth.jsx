import { useState } from 'react';
import { supabase, appOrigin } from '../lib/supabase';
import { Lock, Mail, ShieldCheck } from 'lucide-react';

function Auth({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [mode, setMode] = useState('auth'); // 'auth' | 'forgot'
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appOrigin}/?recovery=1`,
      });
      if (error) throw error;
      setNotice('If that email has an account, a reset link is on its way.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { redirectTo: appOrigin },
        });
        if (error) throw error;
        setError('Check your email to confirm your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess?.();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-breathe" />
            <span className="label text-faint">System online</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Tello</h1>
          <p className="label mt-2">AI co-founder</p>
        </div>

        <div className="panel p-6">
          <div className="flex items-center gap-2 pb-4 mb-5 border-b border-edge">
            <ShieldCheck size={14} className="text-indigo-bright" />
            <span className="label text-ink">
              {mode === 'forgot' ? 'Recover access' : isSignUp ? 'Register operator' : 'Authenticate'}
            </span>
          </div>

          <form onSubmit={mode === 'forgot' ? handleForgot : handleAuth} className="space-y-5">
            <div>
              <label className="label block mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={15} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9 font-mono text-sm"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Passphrase</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError('');
                        setNotice('');
                      }}
                      className="label text-indigo-bright hover:text-white"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={15} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 font-mono text-sm"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="font-mono text-xs text-rose leading-relaxed border-l-2 border-rose/60 pl-3">
                {error}
              </p>
            )}

            {notice && (
              <p className="font-mono text-xs text-cyan leading-relaxed border-l-2 border-cyan/60 pl-3">
                {notice}
              </p>
            )}

            {loading && <div className="scanner" />}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? 'Working...'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : isSignUp
                    ? 'Create account'
                    : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-dim mt-6">
          {mode === 'forgot' ? (
            <button
              onClick={() => {
                setMode('auth');
                setError('');
                setNotice('');
              }}
              className="text-indigo-bright font-medium hover:underline"
            >
              Back to sign in
            </button>
          ) : (
            <>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setNotice('');
                }}
                className="text-indigo-bright font-medium hover:underline"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default Auth;
