import React, { useState } from 'react';
import { useListTasks, useCreateTask, useListAgents, type Task, type Agent } from '@workspace/api-client-react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQueryClient } from '@tanstack/react-query';
import {
  ListChecks, Plus, CheckCircle2, Circle, Clock, XCircle,
  RefreshCw, ChevronDown, ChevronRight, Bot, Wifi, WifiOff,
  Zap, BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  commandType: string;
}

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/30', label: 'COMPLETE' },
  running:   { icon: Clock,        color: 'text-primary',  bg: 'bg-primary/10 border-primary/30',  label: 'RUNNING'  },
  failed:    { icon: XCircle,      color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', label: 'FAILED' },
  pending:   { icon: Circle,       color: 'text-muted-foreground', bg: 'bg-white/5 border-white/10', label: 'QUEUED' },
};

function TaskCard({ task }: { task: any }) {
  const [expanded, setExpanded] = useState(false);
  const steps: Step[] = task.steps ?? [];
  const done = steps.filter(s => s.status === 'completed').length;
  const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : (task.progress ?? 0);
  const cfg = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <Icon size={16} className={`${cfg.color} mt-0.5 shrink-0 ${task.status === 'running' ? 'animate-pulse' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-white truncate">{task.name}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>

          {task.agentId && (
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
              <Bot size={9} /> Agent {task.agentId.slice(0, 8)}
            </div>
          )}

          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>{done}/{steps.length} steps</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${task.status === 'completed' ? 'bg-success' : task.status === 'failed' ? 'bg-destructive' : 'bg-primary'}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground mt-0.5">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 px-3 py-2 space-y-1.5">
              {steps.map((step, i) => {
                const sCfg = STATUS_CONFIG[step.status] ?? STATUS_CONFIG.pending;
                const SIcon = sCfg.icon;
                return (
                  <div key={step.id ?? i} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${sCfg.bg}`}>
                    <SIcon size={12} className={`${sCfg.color} mt-0.5 shrink-0 ${step.status === 'running' ? 'animate-spin' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white/80">{step.description}</div>
                      {step.result && (
                        <div className="text-[10px] text-white/40 mt-0.5 font-mono">{step.result}</div>
                      )}
                    </div>
                    <span className="text-[10px] text-white/30 shrink-0">{i + 1}</span>
                  </div>
                );
              })}
              <div className="text-[10px] text-white/20 pt-1 font-mono">
                ID: {task.id} · {new Date(task.createdAt).toLocaleString()}
                {task.completedAt && ` · Done: ${new Date(task.completedAt).toLocaleTimeString()}`}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TasksApp() {
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();
  const { data: tasks, isLoading, refetch, isFetching } = useListTasks({ query: { refetchInterval: 2000 } });
  const { data: agents } = useListAgents();
  const { mutate: createTask, isPending } = useCreateTask();

  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');

  const [form, setForm] = useState({
    name: '',
    agentId: '',
    steps: 'Analyze request\nPlan execution strategy\nExecute primary task\nValidate results\nReport completion',
    description: '',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const steps = form.steps
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => ({ description: s, commandType: 'execute' }));
    createTask(
      {
        data: {
          name: form.name,
          description: form.description || undefined,
          agentId: form.agentId || undefined,
          steps,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          setForm({ name: '', agentId: '', steps: 'Analyze request\nPlan execution strategy\nExecute primary task\nValidate results\nReport completion', description: '' });
          setShowCreate(false);
          setFilter('running');
        }
      }
    );
  };

  const filtered = (tasks ?? []).filter(t =>
    filter === 'all' ? true : t.status === filter
  );

  const stats = {
    total: tasks?.length ?? 0,
    running: tasks?.filter(t => t.status === 'running').length ?? 0,
    completed: tasks?.filter(t => t.status === 'completed').length ?? 0,
    failed: tasks?.filter(t => t.status === 'failed').length ?? 0,
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 shrink-0">
        <div>
          <h2 className="text-base font-display text-white tracking-wide flex items-center gap-2">
            <ListChecks size={16} className="text-accent" /> Task Forge
          </h2>
          <p className="text-[11px] text-muted-foreground">Multi-step AI task orchestration</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
            isConnected ? 'text-success border-success/30 bg-success/10' : 'text-muted-foreground border-white/10'
          }`}>
            {isConnected ? <Wifi size={9} /> : <WifiOff size={9} />}
            {isConnected ? 'Live' : 'Off'}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreate(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              showCreate
                ? 'bg-accent/30 text-accent border-accent/50'
                : 'bg-accent/10 text-accent border-accent/30 hover:bg-accent/20'
            }`}
          >
            <Plus size={13} /> New Task
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-0 border-b border-white/10 shrink-0">
        {[
          { label: 'Total', count: stats.total, color: 'text-white', filter: 'all' },
          { label: 'Running', count: stats.running, color: 'text-primary', filter: 'running' },
          { label: 'Done', count: stats.completed, color: 'text-success', filter: 'completed' },
          { label: 'Failed', count: stats.failed, color: 'text-destructive', filter: 'failed' },
        ].map(s => (
          <button
            key={s.filter}
            onClick={() => setFilter(s.filter as any)}
            className={`flex flex-col items-center py-2 text-center border-r border-white/10 last:border-0 transition-colors ${
              filter === s.filter ? 'bg-white/5' : 'hover:bg-white/5'
            }`}
          >
            <div className={`text-xl font-display ${s.color}`}>{s.count}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <form onSubmit={handleCreate} className="p-3 border-b border-white/10 bg-black/20 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Task name *"
                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
                  />
                  <select
                    value={form.agentId}
                    onChange={e => setForm(f => ({ ...f, agentId: e.target.value }))}
                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent/50"
                  >
                    <option value="">Any available agent</option>
                    {agents?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/50"
                />
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                    <Zap size={9} /> Steps (one per line)
                  </div>
                  <textarea
                    value={form.steps}
                    onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                    rows={4}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/50 resize-none font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending || !form.name}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent/20 text-accent border border-accent/30 rounded-lg text-xs font-semibold hover:bg-accent/30 transition-colors disabled:opacity-50"
                  >
                    {isPending ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                    Forge & Launch
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 bg-white/5 text-white/50 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-primary animate-pulse">
              <BarChart3 size={36} className="mb-3" />
              <p className="text-sm font-mono">Loading task queue...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-40">
              <ListChecks size={48} className="mb-4" />
              <p className="text-sm">
                {filter === 'all' ? 'No tasks yet. Create one to get started.' : `No ${filter} tasks.`}
              </p>
            </div>
          ) : (
            filtered.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>
    </div>
  );
}
