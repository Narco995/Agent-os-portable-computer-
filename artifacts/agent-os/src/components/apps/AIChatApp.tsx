import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Plus, Trash2, MessageSquare } from 'lucide-react';

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
const API = `${BASE}api`;

export function AIChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamContent]);

  async function loadConversations() {
    try {
      const res = await fetch(`${API}/openai/conversations`);
      const data = await res.json();
      setConversations(data);
    } catch { /* ignore */ }
  }

  async function loadMessages(convId: number) {
    try {
      const res = await fetch(`${API}/openai/conversations/${convId}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch { /* ignore */ }
  }

  async function createConversation() {
    const title = `Chat ${new Date().toLocaleTimeString()}`;
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
    } catch { /* ignore */ }
  }

  async function deleteConversation(id: number) {
    try {
      await fetch(`${API}/openai/conversations/${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
    } catch { /* ignore */ }
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming || !activeConvId) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamContent('');

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API}/openai/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg.content }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.content) {
              accumulated += parsed.content;
              setStreamContent(accumulated);
            }
            if (parsed.done) {
              setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: accumulated,
                createdAt: new Date().toISOString(),
              }]);
              setStreamContent('');
            }
          } catch { /* ignore malformed */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Connection error — please try again.',
          createdAt: new Date().toISOString(),
        }]);
        setStreamContent('');
      }
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, activeConvId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const selectConv = (id: number) => {
    setActiveConvId(id);
    loadMessages(id);
  };

  return (
    <div className="flex h-full bg-black/40">
      {/* Sidebar */}
      <div className="w-52 border-r border-cyan-500/20 flex flex-col bg-black/20">
        <div className="p-3 border-b border-cyan-500/20">
          <button
            onClick={createConversation}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition-colors"
          >
            <Plus size={12} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => selectConv(conv.id)}
              className={`group flex items-center justify-between px-2 py-2 rounded cursor-pointer text-xs transition-colors ${activeConvId === conv.id ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/60 hover:bg-white/5 hover:text-white/90'}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare size={11} className="shrink-0" />
                <span className="truncate">{conv.title}</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConvId ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
                  <Bot size={48} className="text-cyan-400" />
                  <p className="text-sm text-white/60">Agent OS AI Assistant ready.<br/>Ask me anything about the system.</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-cyan-400" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/20 border border-cyan-500/30 text-white'
                      : 'bg-white/5 border border-white/10 text-white/90'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Streaming bubble */}
              {isStreaming && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} className="text-cyan-400 animate-pulse" />
                  </div>
                  <div className="max-w-[80%] px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white/90 whitespace-pre-wrap leading-relaxed">
                    {streamContent || <span className="animate-pulse">▋</span>}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-cyan-500/20">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  placeholder="Message Agent OS AI... (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  className="flex-1 bg-black/40 border border-cyan-500/30 rounded px-3 py-2 text-xs text-white placeholder-white/30 resize-none focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  className="px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <Bot size={64} className="text-cyan-400/40" />
            <div>
              <h3 className="text-lg font-semibold text-white/70 mb-1">Agent OS AI</h3>
              <p className="text-sm text-white/40">Create a new chat or select an existing one.</p>
            </div>
            <button
              onClick={createConversation}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm"
            >
              <Plus size={16} /> Start Chatting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
