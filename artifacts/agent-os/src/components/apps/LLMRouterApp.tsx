import React, { useState, useCallback } from 'react';
import {
  Zap, Activity, AlertTriangle, CheckCircle, XCircle,
  Send, ChevronRight, RotateCcw, DollarSign, Cpu, Layers
} from 'lucide-react';
import { useOSStore } from '@/store/os-store';
import { streamTask } from '@/lib/engine';

// ── Provider Card ─────────────────────────────────────────────────────────────

function ProviderCard({ p, isActive }: { p: any; isActive: boolean }) {
  const statusColor = p.circuit_open
    ? 'rgba(255,50,50,0.8)'
    : p.failure_count > 2
    ? 'rgba(255,165,0,0.8)'
    : 'rgba(0,255,136,0.8)';

  const StatusIcon = p.circuit_open ? XCircle : p.failure_count > 2 ? AlertTriangle : CheckCircle;

  return (
    <div
      className="rounded-xl p-4 border transition-all"
      style={{
        background: isActive ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.03)',
        borderColor: isActive ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)',
        boxShadow: isActive ? '0 0 20px rgba(0,212,255,0.08)' : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
          />
          <span className="text-sm font-bold font-mono" style={{ color: isActive ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.8)' }}>
            {p.name.toUpperCase()}
          </span>
          {isActive && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider"
              style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--neon-cyan)', border: '1px solid rgba(0,212,255,0.3)' }}
            >
              ACTIVE
            </span>
          )}
        </div>
        <StatusIcon size={14} style={{ color: statusColor }} />
      </div>

      <div className="text-[10px] font-mono mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {p.model}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Priority', value: p.priority },
          { label: 'Failures', value: p.failure_count },
          { label: 'Circuit', value: p.circuit_open ? 'OPEN' : 'CLOSED' },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div
              className="text-sm font-bold font-mono"
              style={{ color: label === 'Circuit' && p.circuit_open ? 'rgba(255,50,50,0.8)' : 'rgba(255,255,255,0.7)' }}
            >
              {value}
            </div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Input / 1M</div>
          <div className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.7)' }}>${p.cost_input_per_1m.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Output / 1M</div>
          <div className="text-xs font-mono" style={{ color: 'rgba(168,85,247,0.8)' }}>${p.cost_output_per_1m.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Reasoning Step ────────────────────────────────────────────────────────────

function ReasoningStep({ step, index, total }: { step: string; index: number; total: number }) {
  const isLast = index === total - 1;
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{
            background: isLast ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${isLast ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: isLast ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.4)',
          }}
        >
          {index + 1}
        </div>
        {!isLast && <div className="w-px h-4 mt-1" style={{ background: 'rgba(255,255,255,0.08)' }} />}
      </div>
      <p className="text-xs pt-0.5 leading-relaxed" style={{ color: isLast ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)' }}>
        {step}
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function LLMRouterApp() {
  const { providers, activeProvider, engineConnected, engineUrl, agentRuns, addAgentRun, updateAgentRun, setActiveRun, totalCost, addCost } = useOSStore();
  const [task, setTask] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [tab, setTab] = useState<'run' | 'providers' | 'history'>('run');
  const [liveSteps, setLiveSteps] = useState<string[]>([]);
  const [liveAnswer, setLiveAnswer] = useState('');
  const abortRef = React.useRef<AbortController | null>(null);

  const handleRun = useCallback(async () => {
    if (!task.trim() || isRunning) return;

    const runId = crypto.randomUUID();
    const run = {
      id: runId,
      task: task.trim(),
      status: 'running' as const,
      reasoningSteps: [],
      toolsCalled: [],
      finalAnswer: '',
      provider: activeProvider,
      tokensUsed: 0,
      cost: 0,
      startedAt: new Date().toISOString(),
    };

    addAgentRun(run);
    setActiveRun(runId);
    setIsRunning(true);
    setLiveSteps([]);
    setLiveAnswer('');
    setTask('');

    abortRef.current = new AbortController();

    try {
      for await (const event of streamTask(task.trim(), engineUrl, abortRef.current.signal)) {
        setLiveSteps([...event.reasoning_steps]);
        setLiveAnswer(event.final_answer);
        updateAgentRun(runId, {
          reasoningSteps: event.reasoning_steps,
          toolsCalled: event.tools_called,
          finalAnswer: event.final_answer,
          provider: (event.execution_metadata as any)?.llm_provider ?? activeProvider,
          tokensUsed: (event.execution_metadata as any)?.tokens_used ?? 0,
          cost: (event.execution_metadata as any)?.cost ?? 0,
        });
      }
      const finalCost = agentRuns.find(r => r.id === runId)?.cost ?? 0;
      addCost(finalCost);
      updateAgentRun(runId, { status: 'completed', completedAt: new Date().toISOString() });
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        updateAgentRun(runId, { status: 'failed', completedAt: new Date().toISOString() });
      }
    } finally {
      setIsRunning(false);
    }
  }, [task, isRunning, engineUrl, activeProvider, addAgentRun, updateAgentRun, setActiveRun, addCost, agentRuns]);

  const activeRun = agentRuns[0];

  return (
    <div className="flex h-full" style={{ background: '#050510' }}>

      {/* Sidebar */}
      <div className="w-48 border-r shrink-0 flex flex-col" style={{ borderColor: 'rgba(0,212,255,0.08)', background: 'rgba(0,0,0,0.4)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} style={{ color: 'var(--neon-cyan)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--neon-cyan)' }}>LLM Router v2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: engineConnected ? 'var(--neon-green)' : 'rgba(255,50,50,0.8)',
                boxShadow: `0 0 5px ${engineConnected ? 'var(--neon-green)' : 'rgba(255,50,50,0.8)'}`,
              }}
            />
            <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {engineConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <nav className="p-2 space-y-1">
          {[
            { id: 'run',       label: 'Execute',   icon: Send },
            { id: 'providers', label: 'Providers', icon: Layers },
            { id: 'history',   label: 'Runs',      icon: Activity },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
              style={{
                background: tab === id ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: tab === id ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${tab === id ? 'rgba(0,212,255,0.2)' : 'transparent'}`,
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Session Cost</div>
          <div className="flex items-center gap-1">
            <DollarSign size={10} style={{ color: 'rgba(0,255,136,0.6)' }} />
            <span className="text-sm font-mono font-bold" style={{ color: 'rgba(0,255,136,0.8)' }}>
              {totalCost.toFixed(6)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Execute Tab */}
        {tab === 'run' && (
          <div className="flex-1 flex flex-col">
            {/* Live Reasoning */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {(isRunning || (activeRun && liveSteps.length > 0)) && (
                <div
                  className="rounded-xl p-4 border"
                  style={{ background: 'rgba(0,212,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Cpu size={13} style={{ color: 'var(--neon-cyan)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--neon-cyan)' }}>Reasoning Chain</span>
                    {isRunning && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse"
                        style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--neon-cyan)' }}>
                        RUNNING
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {liveSteps.map((step, i) => (
                      <ReasoningStep key={i} step={step} index={i} total={liveSteps.length} />
                    ))}
                    {isRunning && liveSteps.length === 0 && (
                      <p className="text-xs animate-pulse" style={{ color: 'rgba(0,212,255,0.5)' }}>
                        Initializing agent…
                      </p>
                    )}
                  </div>

                  {liveAnswer && (
                    <div
                      className="mt-4 pt-4 border-t"
                      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={12} style={{ color: 'rgba(0,255,136,0.8)' }} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(0,255,136,0.6)' }}>
                          Final Answer
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>{liveAnswer}</p>
                    </div>
                  )}
                </div>
              )}

              {!isRunning && !activeRun && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}
                  >
                    <Zap size={28} style={{ color: 'var(--neon-cyan)' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Agent Engine v2</h3>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      LangGraph · Circuit Breaker · Streaming SSE<br />
                      {providers.filter(p => !p.circuit_open).length}/{providers.length} providers online
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: 'rgba(0,212,255,0.08)', background: 'rgba(0,0,0,0.4)' }}>
              {!engineConnected && (
                <div
                  className="mb-3 px-3 py-2 rounded-lg flex items-center gap-2 text-xs"
                  style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.2)', color: 'rgba(255,165,0,0.8)' }}
                >
                  <AlertTriangle size={12} />
                  Engine offline — start <code className="font-mono text-[10px]">uvicorn src.main:app</code> in agent-engine/
                </div>
              )}
              <div
                className="flex gap-2 rounded-xl p-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,212,255,0.15)' }}
              >
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun(); } }}
                  disabled={isRunning}
                  placeholder="Describe the agent task… (⏎ to execute)"
                  rows={2}
                  className="flex-1 bg-transparent resize-none text-sm text-white placeholder-white/20 outline-none leading-relaxed"
                />
                <div className="flex flex-col gap-1.5 self-end">
                  {isRunning ? (
                    <button
                      onClick={() => abortRef.current?.abort()}
                      className="p-2 rounded-lg transition-all"
                      style={{ background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,50,50,0.3)', color: 'rgba(255,80,80,0.9)' }}
                    >
                      <XCircle size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={handleRun}
                      disabled={!task.trim() || !engineConnected}
                      className="p-2 rounded-lg transition-all disabled:opacity-30"
                      style={{
                        background: task.trim() ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${task.trim() ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: task.trim() ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Providers Tab */}
        {tab === 'providers' && (
          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
              LLM Provider Circuit Breakers
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {providers.map((p) => (
                <ProviderCard key={p.name} p={p} isActive={p.name === activeProvider} />
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {tab === 'history' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Agent Run History
            </h2>
            {agentRuns.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <RotateCcw size={24} className="mx-auto mb-3 opacity-30" />
                <p className="text-xs">No runs yet</p>
              </div>
            ) : agentRuns.map((run) => (
              <div
                key={run.id}
                className="rounded-xl p-3 border"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                    style={{
                      background: run.status === 'completed' ? 'rgba(0,255,136,0.1)' : run.status === 'failed' ? 'rgba(255,50,50,0.1)' : 'rgba(0,212,255,0.1)',
                      color: run.status === 'completed' ? 'rgba(0,255,136,0.8)' : run.status === 'failed' ? 'rgba(255,80,80,0.8)' : 'var(--neon-cyan)',
                    }}
                  >
                    {run.status}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {run.provider} · ${run.cost.toFixed(6)}
                  </span>
                </div>
                <p className="text-xs mb-1 font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{run.task}</p>
                {run.finalAnswer && (
                  <p className="text-[10px] line-clamp-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {run.finalAnswer}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
