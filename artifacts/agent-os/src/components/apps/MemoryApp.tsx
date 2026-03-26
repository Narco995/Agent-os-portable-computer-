import React, { useState, useEffect } from 'react';
import { Brain, Plus, Trash2, RefreshCw, Search, Tag } from 'lucide-react';

interface Memory {
  id: string;
  agentId: string | null;
  type: string;
  content: string;
  tags: string[];
  importance: number;
  createdAt: string;
}

type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'note' | 'all';

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

const TYPE_COLORS: Record<string, string> = {
  episodic:   'text-blue-400   border-blue-500/30   bg-blue-500/10',
  semantic:   'text-purple-400 border-purple-500/30 bg-purple-500/10',
  procedural: 'text-green-400  border-green-500/30  bg-green-500/10',
  note:       'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
};

const TYPE_DESC: Record<string, string> = {
  episodic:   'Events & experiences over time',
  semantic:   'Facts & general knowledge',
  procedural: 'How-to & learned skills',
  note:       'Manual notes & reminders',
};

export function MemoryApp() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<MemoryType>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<string>('note');
  const [newTags, setNewTags] = useState('');
  const [newImportance, setNewImportance] = useState(0.5);

  useEffect(() => { loadMemories(); }, [filter]);

  async function loadMemories() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);
      const res = await fetch(`${API}/memory?${params}`);
      const data = await res.json();
      setMemories(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function addMemory() {
    if (!newContent.trim()) return;
    try {
      await fetch(`${API}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          content: newContent,
          tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
          importance: newImportance,
        }),
      });
      setNewContent('');
      setNewTags('');
      setNewImportance(0.5);
      setShowAdd(false);
      loadMemories();
    } catch { /* ignore */ }
  }

  async function deleteMemory(id: string) {
    try {
      await fetch(`${API}/memory/${id}`, { method: 'DELETE' });
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch { /* ignore */ }
  }

  const filtered = memories.filter(m =>
    !search || m.content.toLowerCase().includes(search.toLowerCase()) ||
    m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-full bg-black/40">
      {/* Sidebar */}
      <div className="w-48 border-r border-cyan-500/20 flex flex-col bg-black/20 p-2">
        <div className="text-[10px] text-white/40 uppercase tracking-wider px-2 py-2 font-semibold">Memory Types</div>
        {(['all', 'episodic', 'semantic', 'procedural', 'note'] as MemoryType[]).map(type => {
          const count = type === 'all' ? memories.length : memories.filter(m => m.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`flex items-center justify-between px-3 py-2 rounded text-xs mb-0.5 transition-colors ${
                filter === type ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <span className="capitalize">{type}</span>
              <span className="text-[10px] bg-white/10 rounded-full px-1.5">{count}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition-colors"
          >
            <Plus size={11} /> Store Memory
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="p-3 border-b border-cyan-500/20 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-black/30 border border-white/10 rounded px-2 py-1">
            <Search size={12} className="text-white/30 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search memories..."
              className="flex-1 bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
            />
          </div>
          <button onClick={loadMemories} className="p-1.5 rounded hover:bg-white/10 text-white/40 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Add Memory Form */}
        {showAdd && (
          <div className="p-3 border-b border-cyan-500/20 bg-black/20 space-y-2">
            <div className="flex gap-2">
              {(['episodic', 'semantic', 'procedural', 'note'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`px-2 py-1 rounded text-xs capitalize border transition-colors ${newType === t ? TYPE_COLORS[t] : 'border-white/10 text-white/40 hover:text-white/70'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="What should the agent remember?"
              rows={2}
              className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/30 resize-none focus:outline-none focus:border-cyan-400/50"
            />
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-1.5 flex-1">
                <Tag size={11} className="text-white/30" />
                <input
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  placeholder="tags, comma, separated"
                  className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/40">Importance</span>
                <input
                  type="range"
                  min={0} max={1} step={0.1}
                  value={newImportance}
                  onChange={e => setNewImportance(parseFloat(e.target.value))}
                  className="w-16 accent-cyan-400"
                />
                <span className="text-[10px] text-cyan-400 w-6">{newImportance.toFixed(1)}</span>
              </div>
              <button
                onClick={addMemory}
                disabled={!newContent.trim()}
                className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 text-xs hover:bg-cyan-500/30 disabled:opacity-40 transition-colors"
              >
                Store
              </button>
            </div>
          </div>
        )}

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center opacity-40">
              <Brain size={40} className="text-cyan-400/40" />
              <p className="text-sm text-white/60">{loading ? 'Loading memories...' : 'No memories stored yet.'}</p>
            </div>
          )}
          {filtered.map(memory => (
            <div key={memory.id} className="group bg-black/30 border border-white/10 rounded-lg p-3 hover:border-white/20 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize font-semibold ${TYPE_COLORS[memory.type] ?? 'text-white/40 border-white/10 bg-white/5'}`}>
                    {memory.type}
                  </span>
                  {memory.agentId && (
                    <span className="text-[10px] text-white/30">agent: {memory.agentId.slice(0, 8)}</span>
                  )}
                  <span className="text-[10px] text-white/20 ml-auto">
                    importance: {(memory.importance * 100).toFixed(0)}%
                  </span>
                </div>
                <button
                  onClick={() => deleteMemory(memory.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <p className="mt-2 text-xs text-white/80 leading-relaxed">{memory.content}</p>
              {memory.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {memory.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-white/40">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1.5 text-[10px] text-white/20">
                {new Date(memory.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
