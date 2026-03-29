import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Plus, Trash2, MessageSquare, Copy, Check, Sparkles, ChevronDown } from 'lucide-react';
import { Markdown } from '@/utils/markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

const BASE = import.meta.env.BASE_URL;
const API  = `${BASE}api`;

const SYSTEM_SUGGESTIONS = [
  'What can Agent OS do?',
  'How do I register an AI agent?',
  'Show me the API endpoints',
  'How does the memory system work?',
  'Write a Python script to list files',
  'Explain the WebSocket protocol',
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-white/70 transition-all"
      title="Copy message"
    >
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  );
}

export function AIChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelInfo, setModelInfo] = useState<{ provider: string; model: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
    // Fetch provider/model info from server
    fetch(`${API}/openai/model`)
      .then(r => r.json())
      .then(setModelInfo)
      .catch(() => {});
  }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamContent]);

  async function loadConversations() {
    try {
      const res = await fetch(`${API}/openai/conversations`);
      setConversations(await res.json());
    } catch { /* ignore */ }
  }

  async function loadMessages(convId: number) {
    try {
      const res = await fetch(`${API}/openai/conversations/${convId}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch { /* ignore */ }
  }

  async function createConversation(firstMessage?: string) {
    const title = firstMessage
      ? firstMessage.slice(0, 36) + (firstMessage.length > 36 ? '…' : '')
      : `Chat · ${new Date().toLocaleTimeString()}`;
    try {
      const res = await fetch(`${API}/openai/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const conv = await res.json();
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      return conv.id as number;
    } catch { return null; }
  }

  async function deleteConversation(id: number) {
    try {
      await fetch(`${API}/openai/conversations/${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
    } catch { /* ignore */ }
  }

  const sendMessage = useCallback(async (overrideContent?: string) => {
    const content = (overrideContent ?? input).trim();
    if (!content || isStreaming) return;

    let convId = activeConvId;
    if (!convId) {
      convId = await createConversation(content);
      if (!convId) return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamContent('');

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API}/openai/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: abortRef.current.signal,
      });
      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) { accumulated += parsed.content; setStreamContent(accumulated); }
            if (parsed.done) {
              setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: accumulated, createdAt: new Date().toISOString() }]);
              setStreamContent('');
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Connection error — please try again.', createdAt: new Date().toISOString() }]);
        setStreamContent('');
      }
    } finally { setIsStreaming(false); }
  }, [input, isStreaming, activeConvId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const selectConv = (id: number) => { setActiveConvId(id); loadMessages(id); };

  const noConvSelected = !activeConvId;

  return (
    <div className="flex h-full" style={{ background: '#07070e' }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-48 border-r flex flex-col shrink-0" style={{ borderColor: 'rgba(0,212,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
          <div className="p-2 border-b" style={{ borderColor: 'rgba(0,212,255,0.1)' }}>
            <button
              onClick={() => createConversation()}
              className="w-full flex items-center gap-2 px-2 py-2 text-xs rounded-lg transition-colors"
              style={{ color: 'var(--neon-cyan)', border: '1px solid rgba(0,212,255,0.2)', background: 'rgba(0,212,255,0.04)' }}
            >
              <Plus size={11} /> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {conversations.length === 0 && (
              <div className="text-center text-[10px] py-6" style={{ color: 'rgba(255,255,255,0.2)' }}>No conversations yet</div>
            )}
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConv(conv.id)}
                className="group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                style={{
                  background: activeConvId === conv.id ? 'rgba(0,212,255,0.12)' : 'transparent',
                  border: `1px solid ${activeConvId === conv.id ? 'rgba(0,212,255,0.2)' : 'transparent'}`,
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <MessageSquare size={9} style={{ color: 'rgba(0,212,255,0.5)', flexShrink: 0 }} />
                  <span className="text-[10px] truncate" style={{ color: activeConvId === conv.id ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.55)' }}>
                    {conv.title}
                  </span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
                  style={{ color: 'var(--neon-pink)' }}
                >
                  <Trash2 size={9} />
                </button>
              </div>
            ))}
          </div>

          {/* Model badge */}
          <div className="p-2 border-t" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[9px] font-mono" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: 'rgba(168,85,247,0.8)' }}>
              <Sparkles size={9} />
              <span title={modelInfo ? `Provider: ${modelInfo.provider}` : ''}>
                {modelInfo ? modelInfo.model : '…'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(0,212,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(s => !s)} className="p-1 rounded" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <ChevronDown size={13} className={sidebarOpen ? '' : '-rotate-90'} />
            </button>
            <span className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.6)' }}>
              {activeConvId
                ? (conversations.find(c => c.id === activeConvId)?.title ?? 'Chat')
                : 'Agent OS AI Assistant'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--neon-green)', boxShadow: '0 0 6px var(--neon-green)' }} />
            <span className="text-[9px] font-mono" style={{ color: 'rgba(0,255,136,0.6)' }}>ONLINE</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {noConvSelected && !isStreaming && (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center px-4">
              <div>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', boxShadow: '0 0 24px rgba(0,212,255,0.1)' }}
                >
                  <Bot size={32} style={{ color: 'var(--neon-cyan)' }} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Agent OS AI</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {modelInfo ? `${modelInfo.model} (${modelInfo.provider})` : 'AI-Powered'} · Full markdown support<br />
                  Knows everything about this system
                </p>
              </div>

              <div className="w-full max-w-sm space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>Suggestions</p>
                {SYSTEM_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1"
                  style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
                >
                  <Bot size={13} style={{ color: 'var(--neon-cyan)' }} />
                </div>
              )}

              <div className="max-w-[82%]">
                {msg.role === 'user' ? (
                  <div
                    className="px-3 py-2 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed"
                    style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.2)' }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className="px-3 py-2.5 rounded-2xl rounded-tl-sm"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <Markdown content={msg.content} />
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                  <CopyButton text={msg.content} />
                </div>
              </div>

              {msg.role === 'user' && (
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1 text-xs font-bold"
                  style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)', color: 'rgb(168,85,247)' }}
                >
                  U
                </div>
              )}
            </div>
          ))}

          {/* Streaming bubble */}
          {isStreaming && (
            <div className="flex gap-3 justify-start">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
              >
                <Bot size={13} style={{ color: 'var(--neon-cyan)' }} className="animate-pulse" />
              </div>
              <div
                className="max-w-[82%] px-3 py-2.5 rounded-2xl rounded-tl-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {streamContent
                  ? <Markdown content={streamContent} />
                  : <span className="text-sm animate-pulse" style={{ color: 'var(--neon-cyan)' }}>▋</span>
                }
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t" style={{ borderColor: 'rgba(0,212,255,0.1)', background: 'rgba(0,0,0,0.4)' }}>
          <div
            className="flex gap-2 rounded-xl p-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,212,255,0.15)' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder="Message Agent OS AI… (⏎ to send, Shift+⏎ for newline)"
              rows={2}
              className="flex-1 bg-transparent resize-none text-sm text-white placeholder-white/20 outline-none leading-relaxed"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              className="self-end p-2 rounded-lg transition-all"
              style={{
                background: input.trim() && !isStreaming ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${input.trim() && !isStreaming ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: input.trim() && !isStreaming ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.2)',
              }}
            >
              <Send size={14} />
            </button>
          </div>
          <div className="text-center mt-1.5 text-[9px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Agent OS AI · {modelInfo ? `${modelInfo.model} via ${modelInfo.provider}` : 'Connecting…'} · Responses may vary
          </div>
        </div>
      </div>
    </div>
  );
}
