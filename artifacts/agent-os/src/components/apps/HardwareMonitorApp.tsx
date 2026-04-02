import React from 'react';
import { useGetSystemState } from '@workspace/api-client-react';
import { useWebSocket } from '@/hooks/use-websocket';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { Cpu, MemoryStick, Network, Zap, Activity, Server, Wifi } from 'lucide-react';

interface HistoryPoint {
  time: string;
  cpu: number;
  memory: number;
  load: number;
}

function StatCard({
  label, value, unit, color, sub,
}: { label: string; value: string | number; unit?: string; color: string; sub?: string }) {
  return (
    <div className="glow-border bg-black/50 p-3 rounded-lg">
      <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-display glow-text ${color}`}>
        {value}<span className="text-sm ml-0.5">{unit}</span>
      </div>
      {sub && <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>}
    </div>
  );
}

export function HardwareMonitorApp() {
  const { data: state, isLoading, isError } = useGetSystemState({
    query: { queryKey: ['/api/system/state'], refetchInterval: 2000 }
  });
  const { isConnected } = useWebSocket();
  const [history, setHistory] = React.useState<HistoryPoint[]>([]);

  React.useEffect(() => {
    if (state) {
      setHistory(prev => {
        const next = [...prev, {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: typeof state.cpu === 'number' ? state.cpu : 0,
          memory: typeof state.memory === 'number' ? state.memory : 0,
          load: Array.isArray(state.loadAverage) ? (state.loadAverage[0] ?? 0) * 10 : 0,
        }];
        return next.length > 30 ? next.slice(1) : next;
      });
    }
  }, [state]);

  if (isLoading && !state) return (
    <div className="h-full flex items-center justify-center text-primary animate-pulse font-mono text-sm">
      Initializing sensors...
    </div>
  );
  if (isError) return (
    <div className="h-full flex items-center justify-center text-destructive text-sm">
      Failed to connect to hardware sensors.
    </div>
  );

  const memUsed = state?.usedMemoryGB?.toFixed(2) ?? '—';
  const memTotal = state?.totalMemoryGB?.toFixed(1) ?? '—';
  const load = state?.loadAverage ?? [0, 0, 0];
  const nets = (state as any)?.networkInterfaces ?? [];

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-black/30 shrink-0">
        <div>
          <h2 className="text-sm font-display text-white tracking-wide">System Monitor</h2>
          <p className="text-[10px] text-muted-foreground">
            {state?.cpuModel ? state.cpuModel.split('@')[0].trim() : 'Hardware'} · {state?.cpuCores ?? '?'} cores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
            isConnected ? 'text-success border-success/30 bg-success/10' : 'text-muted-foreground border-white/10'
          }`}>
            <Wifi size={9} /> WS
          </div>
          <div className="text-[10px] text-muted-foreground font-mono bg-black/40 px-2 py-1 rounded border border-white/5">
            {state?.platform ?? '?'}/{state?.arch ?? '?'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-2 p-3 pb-0">
          <StatCard label="CPU" value={state?.cpu?.toFixed(1) ?? '0.0'} unit="%" color="text-primary"
            sub={`${state?.cpuSpeedMHz ?? 0} MHz`} />
          <StatCard label="Memory" value={state?.memory?.toFixed(1) ?? '0.0'} unit="%" color="text-accent"
            sub={`${memUsed} / ${memTotal} GB`} />
          <StatCard label="Load Avg" value={(state?.loadAverage?.[0] ?? 0).toFixed(2)} color="text-warning"
            sub={`5m: ${(state?.loadAverage?.[1] ?? 0).toFixed(2)}`} />
        </div>

        <div className="grid grid-cols-3 gap-2 px-3 pb-2 pt-2">
          <StatCard label="Uptime" value={Math.floor((state?.uptime ?? 0) / 3600)} unit="h"
            color="text-success" sub={`${Math.floor(((state?.uptime ?? 0) % 3600) / 60)}m ${(state?.uptime ?? 0) % 60}s`} />
          <StatCard label="Agents" value={state?.connectedAgents ?? 0} color="text-primary"
            sub={`${state?.totalCommands ?? 0} commands`} />
          <StatCard label="Node" value={state?.nodeVersion?.replace('v', '') ?? '?'} color="text-white/60"
            sub={state?.hostname ?? 'localhost'} />
        </div>

        {/* AI Accelerator Panel */}
        <div className="mx-3 mb-2 p-3 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={13} className="text-primary" />
            <span className="text-xs font-semibold text-white">AI Compute Layer</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-black/40 rounded p-2 border border-white/10">
              <div className="text-white/40 mb-1">NPU Status</div>
              <div className="text-primary font-semibold">ACTIVE</div>
              <div className="text-white/30 text-[9px]">Software emulation</div>
            </div>
            <div className="bg-black/40 rounded p-2 border border-white/10">
              <div className="text-white/40 mb-1">Inference Mode</div>
              <div className="text-accent font-semibold">Edge + Cloud</div>
              <div className="text-white/30 text-[9px]">Hybrid routing</div>
            </div>
            <div className="bg-black/40 rounded p-2 border border-white/10">
              <div className="text-white/40 mb-1">Model Backend</div>
              <div className="text-success font-semibold">gpt-5.2</div>
              <div className="text-white/30 text-[9px]">OpenAI proxy</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mx-3 mb-2 bg-black/30 rounded-lg border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Activity size={13} className="text-primary" /> Live Metrics
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />CPU</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" />MEM</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning inline-block" />LOAD×10</span>
            </div>
          </div>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 2, right: 2, bottom: 0, left: -30 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff3366" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff3366" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="time" stroke="#ffffff20" fontSize={9} tick={{ fill: '#ffffff30' }} interval="preserveStartEnd" />
                <YAxis stroke="#ffffff20" fontSize={9} tick={{ fill: '#ffffff30' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#00d4ff40', borderRadius: '8px', fontSize: 11 }}
                  itemStyle={{ color: '#00d4ff' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#00d4ff" strokeWidth={2} fill="url(#cpuGrad)" dot={false} animationDuration={200} />
                <Area type="monotone" dataKey="memory" stroke="#ff3366" strokeWidth={2} fill="url(#memGrad)" dot={false} animationDuration={200} />
                <Line type="monotone" dataKey="load" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={false} animationDuration={200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network Interfaces */}
        {nets.length > 0 && (
          <div className="mx-3 mb-3 bg-black/30 rounded-lg border border-white/10 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Network size={13} className="text-primary" />
              <span className="text-xs font-semibold text-white">Network Interfaces</span>
            </div>
            <div className="space-y-1">
              {nets.slice(0, 4).map((iface: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                  <span className="text-white/50 font-mono">{iface.interface}</span>
                  <span className="text-white font-mono">{iface.address}</span>
                  <span className="text-white/30 font-mono text-[10px]">{iface.mac}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Process info */}
        <div className="mx-3 mb-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-black/30 rounded-lg border border-white/10 p-2.5">
            <div className="text-white/40 mb-1 flex items-center gap-1"><Server size={10} /> Process Info</div>
            <div className="space-y-0.5">
              <div className="flex justify-between"><span className="text-white/30">API Uptime</span><span className="text-white font-mono">{state?.processUptime ?? 0}s</span></div>
              <div className="flex justify-between"><span className="text-white/30">CPU Cores</span><span className="text-white font-mono">{state?.cpuCores ?? '?'}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Speed</span><span className="text-white font-mono">{state?.cpuSpeedMHz ?? '?'} MHz</span></div>
            </div>
          </div>
          <div className="bg-black/30 rounded-lg border border-white/10 p-2.5">
            <div className="text-white/40 mb-1 flex items-center gap-1"><MemoryStick size={10} /> Memory Detail</div>
            <div className="space-y-0.5">
              <div className="flex justify-between"><span className="text-white/30">Used</span><span className="text-white font-mono">{state?.usedMemoryGB?.toFixed(2) ?? '?'} GB</span></div>
              <div className="flex justify-between"><span className="text-white/30">Free</span><span className="text-white font-mono">{state?.freeMemoryGB?.toFixed(2) ?? '?'} GB</span></div>
              <div className="flex justify-between"><span className="text-white/30">Total</span><span className="text-white font-mono">{state?.totalMemoryGB?.toFixed(1) ?? '?'} GB</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
