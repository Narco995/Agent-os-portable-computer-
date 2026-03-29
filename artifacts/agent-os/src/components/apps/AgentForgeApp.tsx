import React, { useState } from 'react';
import { FlaskConical, Play, Plus, Trash2, ChevronDown, ChevronRight, Cpu, Code, Globe, Brain } from 'lucide-react';
import { useOSStore } from '@/store/os-store';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  tools: string[];
  systemPrompt: string;
  color: string;
}

const TEMPLATES: AgentTemplate[] = [
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Web search + summarization agent',
    icon: Globe,
    tools: ['web_search', 'summarize', 'extract_facts'],
    systemPrompt: 'You are a research agent. Search the web for information and provide well-cited summaries.',
    color: 'rgba(0,212,255,0.8)',
  },
  {
    id: 'coder',
    name: 'Code Agent',
    description: 'Write, review, and debug code',
    icon: Code,
    tools: ['write_code', 'run_code', 'debug', 'lint'],
    systemPrompt: 'You are a senior software engineer. Write clean, well-tested, production-ready code.',
    color: 'rgba(168,85,247,0.8)',
  },
  {
    id: 'memory',
    name: 'Memory Agent',
    description: 'Persistent RAG-enabled memory retrieval',
    icon: Brain,
    tools: ['qdrant_search', 'qdrant_store', 'summarize'],
    systemPrompt: 'You are a memory retrieval agent. Search the vector store and return relevant context.',
    color: 'rgba(0,255,136,0.8)',
  },
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    description: 'Route tasks to specialized sub-agents',
    icon: Cpu,
    tools: ['delegate', 'merge_results', 'validate'],
    systemPrompt: 'You are an orchestrator. Analyze the task, select the best sub-agents, and combine their results.',
    color: 'rgba(255,165,0,0.8)',
  },
];

interface AgentInstance {
  id: string;
  templateId: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  output: string;
  createdAt: string;
}

export function AgentForgeApp() {
  const { engineConnected } = useOSStore();
  const [instances, setInstances] = useState<AgentInstance[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function spawnAgent(template: AgentTemplate) {
    const inst: AgentInstance = {
      id: crypto.randomUUID(),
      templateId: template.id,
      name: customName.trim() || `${template.name} #${instances.filter(i => i.templateId === template.id).length + 1}`,
      status: 'idle',
      output: '',
      createdAt: new Date().toISOString(),
    };
    setInstances(prev => [inst, ...prev]);
    setCustomName('');
    setSelectedTemplate(null);
  }

  function removeInstance(id: string) {
    setInstances(prev => prev.filter(i => i.id !== id));
  }

  function mockRun(id: string) {
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'running', output: '' } : i));
    setTimeout(() => {
      setInstances(prev => prev.map(i =>
        i.id === id
          ? { ...i, status: 'completed', output: '[Mock] Agent task completed. Connect engine at localhost:8000 for real execution.' }
          : i
      ));
    }, 1800);
  }

  return (
    <div className="flex h-full" style={{ background: '#050510' }}>
      {/* Template Picker */}
      <div className="w-52 border-r shrink-0 flex flex-col" style={{ borderColor: 'rgba(168,85,247,0.15)', background: 'rgba(0,0,0,0.4)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'rgba(168,85,247,0.1)' }}>
          <div className="flex items-center gap-2">
            <FlaskConical size={13} style={{ color: 'rgba(168,85,247,0.8)' }} />
            <span className="text-xs font-bold" style={{ color: 'rgba(168,85,247,0.9)' }}>Agent Forge</span>
            <span
              className="text-[8px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: 'rgba(168,85,247,0.15)', color: 'rgba(168,85,247,0.8)', border: '1px solid rgba(168,85,247,0.25)' }}
            >
              NEW
            </span>
          </div>
          <p className="text-[9px] mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            CrewAI-compatible agent templates
          </p>
        </div>

        <div className="p-2 space-y-1.5 flex-1 overflow-y-auto">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className="w-full text-left p-3 rounded-lg border transition-all"
              style={{
                background: selectedTemplate === t.id ? `${t.color.replace('0.8)', '0.08)')}` : 'rgba(255,255,255,0.02)',
                borderColor: selectedTemplate === t.id ? t.color.replace('0.8)', '0.3)') : 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <t.icon size={11} style={{ color: t.color }} />
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{t.name}</span>
              </div>
              <p className="text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.description}</p>
            </button>
          ))}
        </div>

        {selectedTemplate && (() => {
          const tmpl = TEMPLATES.find(t => t.id === selectedTemplate)!;
          return (
            <div className="p-3 border-t space-y-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder={`${tmpl.name} instance name`}
                className="w-full bg-black/50 border rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
              />
              <button
                onClick={() => spawnAgent(tmpl)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: `${tmpl.color.replace('0.8)', '0.15)')}`,
                  border: `1px solid ${tmpl.color.replace('0.8)', '0.3)')}`,
                  color: tmpl.color,
                }}
              >
                <Plus size={12} />
                Spawn Agent
              </button>
            </div>
          );
        })()}
      </div>

      {/* Instances Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Active Agents ({instances.length})
          </span>
          {!engineConnected && (
            <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: 'rgba(255,165,0,0.1)', color: 'rgba(255,165,0,0.7)', border: '1px solid rgba(255,165,0,0.2)' }}>
              Engine offline
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {instances.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}
              >
                <FlaskConical size={28} style={{ color: 'rgba(168,85,247,0.6)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">No agents spawned</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Pick a template from the sidebar to create an agent instance
                </p>
              </div>
            </div>
          )}

          {instances.map((inst) => {
            const tmpl = TEMPLATES.find(t => t.id === inst.templateId)!;
            const isExpanded = expandedId === inst.id;
            return (
              <div
                key={inst.id}
                className="rounded-xl border overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${tmpl.color.replace('0.8)', '0.1)')}`, border: `1px solid ${tmpl.color.replace('0.8)', '0.2)')}` }}
                    >
                      <tmpl.icon size={13} style={{ color: tmpl.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{inst.name}</p>
                      <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{tmpl.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                      style={{
                        background: inst.status === 'completed' ? 'rgba(0,255,136,0.1)' : inst.status === 'running' ? 'rgba(0,212,255,0.1)' : inst.status === 'error' ? 'rgba(255,50,50,0.1)' : 'rgba(255,255,255,0.06)',
                        color: inst.status === 'completed' ? 'rgba(0,255,136,0.8)' : inst.status === 'running' ? 'var(--neon-cyan)' : inst.status === 'error' ? 'rgba(255,80,80,0.8)' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {inst.status}
                    </span>
                    {isExpanded ? <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {/* Tools */}
                    <div>
                      <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Tools</p>
                      <div className="flex flex-wrap gap-1">
                        {tmpl.tools.map(tool => (
                          <span
                            key={tool}
                            className="text-[9px] px-2 py-0.5 rounded font-mono"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* System prompt preview */}
                    <div>
                      <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>System Prompt</p>
                      <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{tmpl.systemPrompt}</p>
                    </div>

                    {/* Output */}
                    {inst.output && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: 'rgba(0,255,136,0.5)' }}>Output</p>
                        <p className="text-[10px] leading-relaxed font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{inst.output}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => mockRun(inst.id)}
                        disabled={inst.status === 'running'}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                        style={{
                          background: `${tmpl.color.replace('0.8)', '0.12)')}`,
                          border: `1px solid ${tmpl.color.replace('0.8)', '0.25)')}`,
                          color: tmpl.color,
                        }}
                      >
                        <Play size={10} />
                        {inst.status === 'running' ? 'Running…' : 'Run'}
                      </button>
                      <button
                        onClick={() => removeInstance(inst.id)}
                        className="px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.15)', color: 'rgba(255,80,80,0.6)' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
