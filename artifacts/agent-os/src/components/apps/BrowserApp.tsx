import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Home } from 'lucide-react';

export function BrowserApp() {
  const [url, setUrl] = useState('https://example.com');
  const [inputUrl, setInputUrl] = useState('https://example.com');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = inputUrl;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    setUrl(finalUrl);
    setInputUrl(finalUrl);
  };

  return (
    <div className="h-full flex flex-col bg-white text-black">
      <div className="bg-[#1a1a24] text-white p-2 flex items-center gap-2 border-b border-white/10">
        <button className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <button className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
          <ArrowRight size={16} />
        </button>
        <button className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 500); }}>
          <RotateCcw size={16} />
        </button>
        <button className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" onClick={() => { setUrl('https://example.com'); setInputUrl('https://example.com'); }}>
          <Home size={16} />
        </button>
        
        <form onSubmit={handleSubmit} className="flex-1 ml-2">
          <input 
            type="text" 
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-full px-4 py-1 text-sm focus:outline-none focus:border-primary/50 text-gray-200"
            placeholder="Search or enter web address"
          />
        </form>
      </div>
      
      <div className="flex-1 relative bg-[#f8f9fa]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe 
          src={url} 
          className="w-full h-full border-none"
          title="Virtual Browser"
          sandbox="allow-same-origin allow-scripts allow-forms"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
