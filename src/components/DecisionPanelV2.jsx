import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Check,
  Copy,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
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

  // Voice input (Web Speech API) — appends transcript to the context field
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

  const callWorker = async (path, payload) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Tello worker request failed');
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
        const { analysis: visionAnalysis } = await callWorker('/vision', { image_data: dataUrl });
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
      const { analysis: result } = await callWorker('/analyze', {
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
      const { reply } = await callWorker('/chat', {
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
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to dashboard
      </button>

      {/* Decision input */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">New Decision</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Should we raise prices?"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Context</label>
            <button
              type="button"
              onClick={toggleListening}
              className={`flex items-center gap-2 text-sm font-semibold ${
                listening ? 'text-red-600' : 'text-blue-600'
              }`}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
              {listening ? 'Stop' : 'Speak'}
            </button>
          </div>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="What's the situation?"
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options (one per line)
          </label>
          <textarea
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder={'Raise prices 20%\nKeep prices, cut costs'}
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Images */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer">
            <ImagePlus size={16} />
            Attach images
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
          </label>

          {images.length > 0 && (
            <div className="mt-4 space-y-3">
              {images.map((img) => (
                <div key={img.id} className="flex gap-3 p-3 bg-gray-50 rounded">
                  <img src={img.dataUrl} alt={img.name} className="w-16 h-16 object-cover rounded" />
                  <div className="flex-1 text-sm text-gray-700">
                    {img.analysis || 'Analyzing image...'}
                  </div>
                  <button onClick={() => removeImage(img.id)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !context.trim()}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {analyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {analyzing ? 'Analyzing...' : 'Ask Tello'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Saving...' : decisionId ? 'Update Decision' : 'Save Decision'}
          </button>
        </div>
      </div>

      {/* Analysis */}
      {analysis && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Tello's Analysis</h2>
            <button
              onClick={() => speak(analysis)}
              className="flex items-center gap-2 text-blue-600 text-sm font-semibold hover:underline"
            >
              <Volume2 size={16} />
              Listen
            </button>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{analysis}</p>
        </div>
      )}

      {/* Share link */}
      {shareToken && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Share2 size={18} />
            Share with an advisor
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-4 py-2 border border-blue-200 rounded-lg bg-white text-sm text-gray-700"
            />
            <button
              onClick={copyShareUrl}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Talk it through</h2>
        </div>

        <div className="p-6 space-y-4">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Ask Tello a follow-up question about this decision.
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  message.role === 'user' ? 'bg-gray-100 text-gray-900' : 'bg-blue-50 text-blue-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleChat} className="p-6 border-t border-gray-200 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="What am I missing?"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={chatting || !chatInput.trim()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {chatting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default DecisionPanelV2;
