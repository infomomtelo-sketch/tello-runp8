import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound, Lock } from 'lucide-react';

// Shown after Supabase sends the user back from a recovery link. At that point
// the session is already established, so the password can be set directly.
function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      onDone?.();
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
          <h1 className="text-3xl font-bold tracking-tight text-white">Tello</h1>
          <p className="label mt-2">Set a new passphrase</p>
        </div>

        <div className="panel p-6">
          <div className="flex items-center gap-2 pb-4 mb-5 border-b border-edge">
            <KeyRound size={14} className="text-indigo-bright" />
            <span className="label text-ink">Recovery</span>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label block mb-2">New passphrase</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={15} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-9 font-mono text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label block mb-2">Confirm</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={15} />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat it"
                  className="pl-9 font-mono text-sm"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="font-mono text-xs text-rose border-l-2 border-rose/60 pl-3">{error}</p>
            )}

            {loading && <div className="scanner" />}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Saving...' : 'Set passphrase'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
