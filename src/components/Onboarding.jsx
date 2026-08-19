import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const STEPS = [
  { key: 'name', label: 'Business name', hint: 'Acme Inc', type: 'text' },
  { key: 'type', label: 'Business type', type: 'select' },
  { key: 'description', label: 'Brief description', hint: 'What do you do?', type: 'textarea' },
  { key: 'monthly_revenue', label: 'Monthly revenue (USD)', hint: '0', type: 'number' },
  {
    key: 'constraints',
    label: 'Key constraints',
    hint: 'Solo founder, limited budget...',
    type: 'textarea',
  },
];

const BUSINESS_TYPES = ['product', 'services', 'marketplace', 'saas', 'other'];

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    monthly_revenue: 0,
    constraints: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const current = STEPS[step - 1];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'monthly_revenue' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error: insertError } = await supabase
        .from('tello_businesses')
        .insert([{ user_id: user.id, ...formData }])
        .select()
        .single();

      if (insertError) throw insertError;
      onComplete(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Initialize</h1>
          <span className="readout text-xs">
            {String(step).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
        </div>

        {/* Step meter */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`h-0.5 flex-1 transition-all duration-300 ${
                i < step ? 'bg-indigo-bright shadow-glow-sm' : 'bg-edge'
              }`}
            />
          ))}
        </div>

        <div className="panel p-6">
          <label className="label block mb-3">{current.label}</label>

          {current.type === 'select' ? (
            <select name="type" value={formData.type} onChange={handleChange}>
              <option value="">Select...</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          ) : current.type === 'textarea' ? (
            <textarea
              name={current.key}
              value={formData[current.key]}
              onChange={handleChange}
              placeholder={current.hint}
              rows="4"
            />
          ) : (
            <input
              type={current.type}
              name={current.key}
              value={formData[current.key]}
              onChange={handleChange}
              placeholder={current.hint}
              className={current.type === 'number' ? 'font-mono' : ''}
            />
          )}

          {error && (
            <p className="font-mono text-xs text-rose mt-4 border-l-2 border-rose/60 pl-3">
              {error}
            </p>
          )}

          {loading && <div className="scanner mt-5" />}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="btn-ghost flex-1"
            >
              <ArrowLeft size={15} />
              Back
            </button>
            <button
              type="button"
              onClick={() => (step === STEPS.length ? handleComplete() : setStep(step + 1))}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Creating...' : step === STEPS.length ? 'Create' : 'Next'}
              {step === STEPS.length ? <Check size={15} /> : <ArrowRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
