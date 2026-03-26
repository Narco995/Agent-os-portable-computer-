import React, { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Home, Globe, AlertTriangle } from 'lucide-react';

const BOOKMARKS = [
  { label: 'Agent OS API', url: '/api/healthz', internal: true },
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'Wikipedia', url: 'https://en.wikipedia.org' },
  { label: 'OpenAI', url: 'https://openai.com' },
];

const WELCOME_HTML = `
<!DOCTYPE html>
<html style="background:#0a0a0f;color:#e0e0e0;font-family:monospace;margin:0;padding:0;height:100%">
<body style="padding:32px;background:#0a0a0f;min-height:100vh">
  <div style="max-width:600px;margin:0 auto">
    <div style="color:#00d4ff;font-size:24px;font-weight:bold;margin-bottom:8px;text-shadow:0 0 20px #00d4ff88">
      ⬡ Agent OS Browser
    </div>
    <div style="color:#ffffff50;font-size:13px;margin-bottom:32px;border-bottom:1px solid #ffffff15;padding-bottom:16px">
      Virtual browsing environment · Type a URL above to navigate
    </div>

    <div style="margin-bottom:24px">
      <div style="color:#00ff88;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px">Quick Links</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <a href="https://en.wikipedia.org/wiki/Artificial_intelligence" target="_blank"
           style="background:#ffffff08;border:1px solid #ffffff15;border-radius:8px;padding:12px;text-decoration:none;color:#e0e0e0;transition:all 0.2s;display:block">
          <div style="color:#00d4ff;margin-bottom:4px">📖 Wikipedia — AI</div>
          <div style="font-size:11px;color:#ffffff50">Artificial Intelligence article</div>
        </a>
        <a href="https://github.com/features/copilot" target="_blank"
           style="background:#ffffff08;border:1px solid #ffffff15;border-radius:8px;padding:12px;text-decoration:none;color:#e0e0e0;display:block">
          <div style="color:#00d4ff;margin-bottom:4px">🐙 GitHub Copilot</div>
          <div style="font-size:11px;color:#ffffff50">AI coding assistant</div>
        </a>
        <a href="https://huggingface.co" target="_blank"
           style="background:#ffffff08;border:1px solid #ffffff15;border-radius:8px;padding:12px;text-decoration:none;color:#e0e0e0;display:block">
          <div style="color:#00d4ff;margin-bottom:4px">🤗 HuggingFace</div>
          <div style="font-size:11px;color:#ffffff50">Open-source AI models</div>
        </a>
        <a href="https://arxiv.org/list/cs.AI/recent" target="_blank"
           style="background:#ffffff08;border:1px solid #ffffff15;border-radius:8px;padding:12px;text-decoration:none;color:#e0e0e0;display:block">
          <div style="color:#00d4ff;margin-bottom:4px">📄 arXiv — AI Papers</div>
          <div style="font-size:11px;color:#ffffff50">Latest AI research</div>
        </a>
      </div>
    </div>

    <div style="background:#ffffff05;border:1px solid #ffffff10;border-radius:8px;padding:16px;font-size:12px;color:#ffffff60">
      <div style="color:#00d4ff;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:1px">ℹ System Note</div>
      Some external sites block embedding in iframes for security reasons. If a site doesn't load, 
      try opening it in a new tab via the link above, or visit a different URL.
    </div>
  </div>
</body>
</html>
`;

export function BrowserApp() {
  const [url, setUrl] = useState('about:blank');
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function navigate(target: string) {
    let finalUrl = target.trim();
    if (!finalUrl) return;

    if (finalUrl.startsWith('/')) {
      // Internal API
      finalUrl = finalUrl;
    } else if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('about:')) {
      finalUrl = 'https://' + finalUrl;
    }

    setIframeError(false);
    setIsLoading(true);
    setUrl(finalUrl);
    setInputUrl(finalUrl);

    const newHistory = [...history.slice(0, historyIndex + 1), finalUrl];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(inputUrl);
  }

  function goBack() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setInputUrl(history[newIndex]);
      setIframeError(false);
      setIsLoading(true);
    }
  }

  function goForward() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setInputUrl(history[newIndex]);
      setIframeError(false);
      setIsLoading(true);
    }
  }

  const showWelcome = url === 'about:blank';

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Browser Bar */}
      <div className="bg-[#111118] p-2 flex items-center gap-1.5 border-b border-white/10 shrink-0">
        <button
          onClick={goBack}
          disabled={historyIndex <= 0}
          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={goForward}
          disabled={historyIndex >= history.length - 1}
          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={() => { setIsLoading(true); setIframeError(false); setUrl(u => u + ''); }}
          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
        >
          <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => { setUrl('about:blank'); setInputUrl(''); setIframeError(false); }}
          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
        >
          <Home size={14} />
        </button>

        <form onSubmit={handleSubmit} className="flex-1 mx-1">
          <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-lg px-3 py-1 focus-within:border-cyan-500/50 transition-colors">
            <Globe size={12} className="text-gray-500 shrink-0" />
            <input
              type="text"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              className="flex-1 bg-transparent text-xs focus:outline-none text-gray-200 placeholder-gray-600"
              placeholder="Search or enter URL..."
            />
          </div>
        </form>
      </div>

      {/* Bookmarks bar */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-white/5 bg-black/20 overflow-x-auto shrink-0">
        {BOOKMARKS.map(b => (
          <button
            key={b.url}
            onClick={() => navigate(b.url)}
            className="text-[10px] px-2 py-0.5 rounded text-gray-400 hover:text-cyan-400 hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-white overflow-hidden">
        {isLoading && !showWelcome && (
          <div className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {iframeError && (
          <div className="absolute inset-0 bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 z-20 p-8 text-center">
            <AlertTriangle size={40} className="text-yellow-500" />
            <div>
              <h3 className="text-white font-semibold mb-1">Cannot Display This Page</h3>
              <p className="text-sm text-gray-400 mb-4">
                This site refuses to load inside a frame (X-Frame-Options).<br />
                This is a security policy of the external site.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors"
              >
                <Globe size={14} /> Open in New Tab
              </a>
            </div>
          </div>
        )}

        {showWelcome ? (
          <iframe
            srcDoc={WELCOME_HTML}
            className="w-full h-full border-none"
            title="Welcome"
          />
        ) : (
          <iframe
            key={url}
            ref={iframeRef}
            src={url}
            className="w-full h-full border-none"
            title="Virtual Browser"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setIframeError(true); }}
          />
        )}
      </div>
    </div>
  );
}
