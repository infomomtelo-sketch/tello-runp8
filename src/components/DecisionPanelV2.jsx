import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Check,
  Copy,
  ImagePlus,
  Mic,
  MicOff,
  Save,
  Send,
  Share2,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';

// Served by the Pages Functions in functions/api/ — same origin, so no CORS
// and no configured URL to keep in sync.
const API_BASE = '/api';

const makeShareToken = () =>
  (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/-/g, '').slice(0, 24);

function Section({ title, right, children, className = '' }) {
  return (
    <section className={`panel overflow-hidden ${className}`}>
      <header className="flex items-center justify-between px-5 py-3 border-b border-edge">
        <span className="label text-ink">{title}</span>
        {right}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function DecisionPanelV2({ business, onBack }) {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [options, setOptions] = useState('');
  const [images, setImages] = useState([]);

  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [decisionId, setDecisionId] = useState(null);
  const [shareToken, setShareToken] = useState(null);
  const [copied, setCopied] = useState(false);

  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  // Voice input (Web Speech API) — appends transcript to the context field.
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();
      if (transcript) setContext((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = (event) => {
      setError(`Voice input error: ${event.error}`);
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, []);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError('Voice input is not supported in this browser.');
      return;
    }
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      setError('');
      recognition.start();
      setListening(true);
    }
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const callApi = async (path, payload) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';

    for (const file of files) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const image = { id: makeShareToken(), name: file.name, dataUrl, analysis: null };
      setImages((prev) => [...prev, image]);

      try {
        const { analysis: visionAnalysis } = await callApi('/vision', { image_data: dataUrl });
        setImages((prev) =>
          prev.map((img) => (img.id === image.id ? { ...img, analysis: visionAnalysis } : img))
        );
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const removeImage = (id) => setImages((prev) => prev.filter((img) => img.id !== id));

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');

    try {
      const { analysis: result } = await callApi('/analyze', {
        context,
        options,
        business_type: business.type,
        revenue: business.monthly_revenue,
        constraints: business.constraints,
        images: images.map((img) => img.analysis).filter(Boolean),
      });
      setAnalysis(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const nextMessages = [...messages, { role: 'user', content: chatInput.trim() }];
    setMessages(nextMessages);
    setChatInput('');
    setChatting(true);
    setError('');

    try {
      const { reply } = await callApi('/chat', {
        messages: nextMessages,
        context,
        business_type: business.type,
      });
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setChatting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const token = shareToken || makeShareToken();
      const optionList = options
        .split('\n')
        .map((option) => option.trim())
        .filter(Boolean);

      const { data, error: saveError } = await supabase
        .from('tello_decisions')
        .upsert({
          ...(decisionId ? { id: decisionId } : {}),
          user_id: (await supabase.auth.getUser()).data.user.id,
          business_id: business.id,
          title,
          context,
          options: optionList,
          reasoning: analysis,
          share_token: token,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (saveError) throw saveError;

      if (!decisionId && images.length > 0) {
        const { error: imageError } = await supabase.from('tello_decision_images').insert(
          images.map((img) => ({
            decision_id: data.id,
            image_url: img.dataUrl,
            vision_analysis: img.analysis ? { analysis: img.analysis } : null,
          }))
        );
        if (imageError) throw imageError;
      }

      setDecisionId(data.id);
      setShareToken(data.share_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = shareToken ? `${window.location.origin}/?share=${shareToken}` : '';

  const copyShareUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <button onClick={onBack} className="pip text-faint hover:text-ink transition-colors">
        <ArrowLeft size={13} />
        Dashboard
      </button>

      <Section
        title="New decision"
        right={<span className="readout text-[11px] text-faint">{business.type}</span>}
      >
        <div className="space-y-5">
          <div>
            <label className="label block mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Should we raise prices?"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">Context</label>
              <button
                type="button"
                onClick={toggleListening}
                className={`pip transition-colors ${
                  listening ? 'text-rose' : 'text-indigo-bright hover:text-white'
                }`}
              >
                {listening ? <MicOff size={13} /> : <Mic size={13} />}
                {listening ? 'Listening' : 'Speak'}
              </button>
            </div>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What's the situation?"
              rows="4"
            />
          </div>

          <div>
            <label className="label block mb-2">Options — one per line</label>
            <textarea
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder={'Raise prices 20%\nKeep prices, cut costs'}
              rows="3"
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="pip text-indigo-bright hover:text-white cursor-pointer transition-colors">
              <ImagePlus size={13} />
              Attach images
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {images.length > 0 && (
              <div className="mt-4 space-y-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="flex gap-3 bg-hull border border-edge rounded-md p-3"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-14 h-14 object-cover rounded border border-edge"
                    />
                    <div className="flex-1 min-w-0">
                      {img.analysis ? (
                        <p className="text-sm text-dim">{img.analysis}</p>
                      ) : (
                        <>
                          <p className="label mb-2">Analyzing</p>
                          <div className="scanner" />
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="text-faint hover:text-rose shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="font-mono text-xs text-rose border-l-2 border-rose/60 pl-3">{error}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !context.trim()}
              className="btn-primary"
            >
              <Sparkles size={15} />
              {analyzing ? 'Analyzing...' : 'Ask Tello'}
            </button>
            <button onClick={handleSave} disabled={saving || !title.trim()} className="btn-ghost">
              <Save size={15} />
              {saving ? 'Saving...' : decisionId ? 'Update' : 'Save decision'}
            </button>
          </div>

          {analyzing && <div className="scanner" />}
        </div>
      </Section>

      {analysis && (
        <Section
          title="Tello's analysis"
          right={
            <button
              onClick={() => speak(analysis)}
              className="pip text-indigo-bright hover:text-white"
            >
              <Volume2 size={13} />
              Listen
            </button>
          }
        >
          <p className="text-ink leading-relaxed whitespace-pre-wrap">{analysis}</p>
        </Section>
      )}

      {shareToken && (
        <Section
          title="Share link"
          right={<span className="pip text-emerald">read only</span>}
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="font-mono text-xs text-cyan"
            />
            <button onClick={copyShareUrl} className="btn-primary shrink-0">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="label mt-3 text-faint">
            <Share2 size={11} className="inline mr-1.5" />
            Anyone with this link can read the decision
          </p>
        </Section>
      )}

      <Section title="Talk it through">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-dim">Ask Tello a follow-up about this decision.</p>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`rounded-md p-4 text-sm leading-relaxed animate-fade-up ${
                  message.role === 'user'
                    ? 'bg-raised/60 border border-edge text-ink ml-6'
                    : 'bg-indigo/10 border border-indigo/30 text-ink mr-6'
                }`}
              >
                <p className="label mb-2 text-faint">
                  {message.role === 'user' ? 'You' : 'Tello'}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))
          )}

          {chatting && <div className="scanner" />}

          <form onSubmit={handleChat} className="flex gap-2 pt-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="What am I missing?"
            />
            <button
              type="submit"
              disabled={chatting || !chatInput.trim()}
              className="btn-primary shrink-0"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </Section>
    </div>
  );
}

export default DecisionPanelV2;
