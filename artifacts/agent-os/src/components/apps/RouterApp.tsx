import React, { useState, useEffect, useRef } from 'react';
import {
  useListAgents, useUnregisterAgent, useRegisterAgent,
  useCreateTask, useListTasks,
  type Agent, type Task,
} from '@workspace/api-client-react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQueryClient } from '@tanstack/react-query';
import {
  WifiOff, Wifi, Plus, Trash2, Send, Zap, Network,
  Radio, CheckCircle2, Circle, Bot, ChevronRight,
  ListChecks, PlugZap, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'network' | 'dispatch' | 'tasks' | 'events';

interface WSEventItem {
  type: string;
  payload?: any;
  message?: string;
  timestamp?: string;
  _id: number;
}

const CAPABILITY_OPTIONS = ['click', 'type', 'screenshot', 'browser', 'code', 'file', 'memory', 'api', 'vision', 'voice'];

function AgentStatusDot({ status }: { status: string }) {
  const color = status === 'active'
    ? 'bg-success shadow-[0_0_8px_var(--color-success)]'
    : status === 'busy'
    ? 'bg-warning shadow-[0_0_8px_var(--color-warning)]'
    : 'bg-muted-foreground';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

export function RouterApp() {
  const [tab, setTab] = useState<Tab>('network');
  const { isConnected, lastEvent, sendMessage } = useWebSocket();
  const queryClient = useQueryClient();

  const { data: agents, isLoading: agentsLoading } = useListAgents({
    query: { queryKey: ['/api/agents'], refetchInterval: 5000 }
  });
  const { data: tasks } = useListTasks({
    query: { queryKey: ['/api/tasks'], refetchInterval: 3000 }
  });
  const { mutate: unregister } = useUnregisterAgent();
  const { mutate: registerAgent, isPending: isRegistering } = useRegisterAgent();
  const { mutate: createTask, isPending: isCreatingTask } = useCreateTask();

  const [events, setEvents] = useState<WSEventItem[]>([]);
  const eventIdRef = useRef(0);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastEvent) {
      setEvents(prev => {
        const next = [...prev, { ...lastEvent, _id: ++eventIdRef.current }];
        return next.length > 200 ? next.slice(-200) : next;
      });
    }
  }, [lastEvent]);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const [regName, setRegName] = useState('');
  const [regEndpoint, setRegEndpoint] = useState('');
  const [regCaps, setRegCaps] = useState<string[]>(['click', 'type', 'screenshot']);

  const [dispatchAgent, setDispatchAgent] = useState('');
  const [dispatchType, setDispatchType] = useState('message');
  const [dispatchPayload, setDispatchPayload] = useState('{"text":"Hello agent!"}');

  const [taskName, setTaskName] = useState('');
  const [taskAgentId, setTaskAgentId] = useState('');
  const [taskSteps, setTaskSteps] = useState('Browse documentation\nExtract key points\nSummarize findings');

  const handleUnregister = (id: string) => {
    unregister({ agentId: id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/agents'] })
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;
    registerAgent(
      { data: { name: regName, endpoint: regEndpoint || undefined, capabilities: regCaps } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
          setRegName('');
          setRegEndpoint('');
          setTab('network');
        }
      }
    );
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = JSON.parse(dispatchPayload);
      sendMessage('agent:dispatch', { agentId: dispatchAgent || 'broadcast', type: dispatchType, payload });
      setEvents(prev => [...prev, {
        type: 'agent:dispatch',
        message: `Dispatched "${dispatchType}" to ${dispatchAgent ? `agent ${dispatchAgent.slice(0, 8)}` : 'all agents'}`,
        timestamp: new Date().toISOString(),
        _id: ++eventIdRef.current,
      }]);
    } catch {
      alert('Invalid JSON payload');
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    const steps = taskSteps
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => ({ description: s, commandType: 'execute' }));
    createTask(
      { data: { name: taskName, agentId: taskAgentId || undefined, steps } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          setTaskName('');
          setTab('tasks');
        }
      }
    );
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'network', label: 'Network', icon: Network },
    { id: 'dispatch', label: 'Dispatch', icon: Send },
    { id: 'tasks', label: 'Tasks', icon: ListChecks },
    { id: 'events', label: 'Events', icon: Radio },
  ];

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
        <div>
          <h2 className="text-base font-display text-white tracking-wide">Agent Router Network</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Multi-agent orchestration & dispatch</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            isConnected
              ? 'bg-success/10 text-success border-success/30'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          }`}>
            {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isConnected ? 'WS Live' : 'WS Off'}
          </div>
          <div className="text-right">
            <div className="text-lg font-display text-primary glow-text">{agents?.length ?? 0}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Agents</div>
          </div>
        </div>
      </div>

      <div className="flex gap-0.5 px-3 pt-2 bg-black/20">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all ${
              tab === t.id
                ? 'text-primary border-primary bg-primary/5'
                : 'text-muted-foreground border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <t.icon size={13} />
            {t.label}
            {t.id === 'events' && events.length > 0 && (
              <span className="ml-0.5 bg-primary/20 text-primary rounded-full px-1.5 text-[10px]">{events.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === 'network' && (
            <motion.div key="network" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              <form onSubmit={handleRegister} className="m-3 mb-0 p-3 bg-black/30 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <PlugZap size={13} className="text-accent" />
                  <span className="text-xs font-semibold text-white">Register New Agent</span>
                </div>
                <div className="flex gap-2">
                  <input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Agent name..."
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50" />
                  <input value={regEndpoint} onChange={e => setRegEndpoint(e.target.value)} placeholder="Endpoint (opt.)"
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50" />
                  <button type="submit" disabled={isRegistering || !regName}
                    className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold hover:bg-primary/30 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {isRegistering ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {CAPABILITY_OPTIONS.map(cap => (
                    <button key={cap} type="button"
                      onClick={() => setRegCaps(prev => prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap])}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        regCaps.includes(cap) ? 'bg-accent/20 text-accent border-accent/40' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                      }`}
                    >{cap}</button>
                  ))}
                </div>
              </form>

              <div className="p-3 space-y-2">
                {agentsLoading ? (
                  <div className="text-center py-8 text-primary animate-pulse text-sm font-mono">Scanning network...</div>
                ) : !agents || agents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                    <WifiOff size={40} className="mb-3" />
                    <p className="text-sm">No agents connected.</p>
                    <p className="text-xs mt-1">Register an agent above to begin.</p>
                  </div>
                ) : agents.map(agent => (
                  <motion.div key={agent.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="glow-border bg-black/40 p-3 rounded-xl group hover:bg-black/60 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                            <Bot size={17} className="text-primary" />
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <AgentStatusDot status={agent.status} />
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">{agent.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {agent.id.substring(0, 12)}...
                            {agent.endpoint && <span className="ml-2 text-primary/70">→ {agent.endpoint}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          agent.status === 'active' ? 'bg-success/10 text-success border-success/30' : 'bg-warning/10 text-warning border-warning/30'
                        }`}>{agent.status.toUpperCase()}</span>
                        <button onClick={() => handleUnregister(agent.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        ><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2 ml-12">
                      {agent.capabilities.map(cap => (
                        <span key={cap} className="text-[10px] px-2 py-0.5 bg-white/5 rounded border border-white/10 text-white/60">{cap}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2 ml-12 text-[10px] text-white/30">
                      <span>Connected {new Date(agent.connectedAt).toLocaleTimeString()}</span>
                      <button onClick={() => { setDispatchAgent(agent.id); setTab('dispatch'); }}
                        className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      ><Send size={11} /> Dispatch</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'dispatch' && (
            <motion.div key="dispatch" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              className="h-full overflow-y-auto custom-scrollbar p-4"
            >
              <form onSubmit={handleDispatch} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Target Agent</label>
                  <select value={dispatchAgent} onChange={e => setDispatchAgent(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="">⚡ Broadcast to All Agents</option>
                    {agents?.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id.slice(0, 8)})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Command Type</label>
                  <div className="flex flex-wrap gap-2">
                    {['message', 'click', 'type', 'screenshot', 'navigate', 'execute', 'query', 'stop'].map(t => (
                      <button key={t} type="button" onClick={() => setDispatchType(t)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          dispatchType === t
                            ? 'bg-primary/20 text-primary border-primary/40 shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                            : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20 hover:text-white'
                        }`}
                      >{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Payload (JSON)</label>
                  <textarea value={dispatchPayload} onChange={e => setDispatchPayload(e.target.value)} rows={4}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>
                <button type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/20 text-primary border border-primary/40 rounded-lg text-sm font-semibold hover:bg-primary/30 transition-all"
                >
                  <Zap size={15} /> Dispatch Command
                </button>
              </form>

              <div className="mt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Quick Presets</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Ping All', type: 'message', payload: '{"text":"ping"}' },
                    { label: 'Screenshot', type: 'screenshot', payload: '{}' },
                    { label: 'Status Check', type: 'query', payload: '{"field":"status"}' },
                    { label: 'Stop All', type: 'stop', payload: '{"reason":"manual"}' },
                  ].map(preset => (
                    <button key={preset.label}
                      onClick={() => { setDispatchType(preset.type); setDispatchPayload(preset.payload); }}
                      className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 hover:text-white hover:border-white/20 transition-colors"
                    >
                      <ChevronRight size={12} className="text-primary/60 shrink-0" /> {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'tasks' && (
            <motion.div key="tasks" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              className="h-full flex flex-col overflow-hidden"
            >
              <form onSubmit={handleCreateTask} className="m-3 mb-0 p-3 bg-black/30 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <ListChecks size={13} className="text-accent" />
                  <span className="text-xs font-semibold text-white">Dispatch Multi-Step Task</span>
                </div>
                <div className="flex gap-2">
                  <input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Task name..."
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50" />
                  <select value={taskAgentId} onChange={e => setTaskAgentId(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="">Any agent</option>
                    {agents?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <textarea value={taskSteps} onChange={e => setTaskSteps(e.target.value)}
                  placeholder="Steps (one per line)..." rows={3}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 resize-none font-mono"
                />
                <button type="submit" disabled={isCreatingTask || !taskName}
                  className="w-full flex items-center justify-center gap-2 py-1.5 bg-accent/20 text-accent border border-accent/30 rounded-lg text-xs font-semibold hover:bg-accent/30 transition-colors disabled:opacity-50"
                >
                  {isCreatingTask ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                  Dispatch Task
                </button>
              </form>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {!tasks || tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-40">
                    <ListChecks size={36} className="mb-3" />
                    <p className="text-sm">No tasks dispatched yet.</p>
                  </div>
                ) : tasks.map(task => {
                  const done = task.steps.filter((s: any) => s.status === 'completed').length;
                  const total = task.steps.length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : (task.progress ?? 0);
                  return (
                    <div key={task.id} className="bg-black/40 rounded-xl p-3 border border-white/10">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-semibold text-white">{task.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{task.id.slice(0, 12)}...</div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          task.status === 'completed' ? 'bg-success/10 text-success border-success/30'
                          : task.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : 'bg-primary/10 text-primary border-primary/30'
                        }`}>{task.status.toUpperCase()}</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                        <motion.div
                          className={`h-full rounded-full ${task.status === 'completed' ? 'bg-success' : 'bg-primary'}`}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {task.steps.map((step: any, i: number) => (
                          <div key={step.id ?? i} title={step.description}
                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
                              step.status === 'completed' ? 'bg-success/10 text-success border-success/20'
                              : step.status === 'running' ? 'bg-primary/10 text-primary border-primary/20 animate-pulse'
                              : 'bg-white/5 text-white/30 border-white/10'
                            }`}
                          >
                            {step.status === 'completed' ? <CheckCircle2 size={9} /> : <Circle size={9} />}
                            {step.description.slice(0, 20)}
                          </div>
                        ))}
                      </div>
                      <div className="mt-1.5 text-[10px] text-white/30 flex items-center justify-between">
                        <span>{done}/{total} steps complete</span>
                        <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === 'events' && (
            <motion.div key="events" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              className="h-full flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Radio size={12} className={isConnected ? 'text-success animate-pulse' : 'text-muted-foreground'} />
                  Live WebSocket Feed ({events.length} events)
                </div>
                <button onClick={() => setEvents([])} className="text-[11px] text-white/30 hover:text-white/70 transition-colors">Clear</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1 pb-3">
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-40">
                    <Radio size={36} className="mb-3" />
                    <p className="text-sm">No events yet.</p>
                    <p className="text-xs mt-1">WebSocket events appear here in real time.</p>
                  </div>
                ) : events.map(ev => (
                  <div key={ev._id} className="flex items-start gap-2 py-1 border-b border-white/5">
                    <span className="text-[10px] text-white/20 font-mono mt-0.5 shrink-0 w-16">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                    </span>
                    <span className={`text-[10px] font-semibold shrink-0 ${
                      ev.type === 'connected' ? 'text-success'
                      : ev.type?.startsWith('agent') ? 'text-accent'
                      : ev.type?.startsWith('error') ? 'text-destructive'
                      : 'text-primary'
                    }`}>{ev.type}</span>
                    <span className="text-[11px] text-white/60 truncate">
                      {ev.message ?? (ev.payload ? JSON.stringify(ev.payload) : '')}
                    </span>
                  </div>
                ))}
                <div ref={eventsEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
